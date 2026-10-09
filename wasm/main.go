//go:build js && wasm

// Analisador de demos do CS2 compilado para WebAssembly.
// Roda dentro de um Web Worker: le o arquivo .dem direto do disco do usuario
// (em pedacos, sem carregar tudo na memoria) e devolve crosshair e viewmodel de cada jogador.
package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"sort"
	"syscall/js"

	demoinfocs "github.com/markus-wa/demoinfocs-golang/v5/pkg/demoinfocs"
	events "github.com/markus-wa/demoinfocs-golang/v5/pkg/demoinfocs/events"
)

type PlayerInfo struct {
	Name          string  `json:"name"`
	SteamID       uint64  `json:"steamid,string"`
	CrosshairCode string  `json:"crosshair_code"`
	ViewmodelFOV  float32 `json:"viewmodel_fov"`
	ViewmodelX    float64 `json:"viewmodel_offset_x"`
	ViewmodelY    float64 `json:"viewmodel_offset_y"`
	ViewmodelZ    float64 `json:"viewmodel_offset_z"`
	ViewmodelCmd  string  `json:"viewmodel_cmd"`
}

// fileReader le um File do navegador usando FileReaderSync (so existe dentro de Workers).
type fileReader struct {
	file js.Value
	sync js.Value
	size int64
	off  int64
}

func (r *fileReader) Read(p []byte) (int, error) {
	if r.off >= r.size {
		return 0, io.EOF
	}
	n := int64(len(p))
	if r.off+n > r.size {
		n = r.size - r.off
	}
	blob := r.file.Call("slice", float64(r.off), float64(r.off+n))
	buf := r.sync.Call("readAsArrayBuffer", blob)
	u8 := js.Global().Get("Uint8Array").New(buf)
	got := js.CopyBytesToGo(p[:n], u8)
	if got == 0 {
		return 0, io.ErrUnexpectedEOF
	}
	r.off += int64(got)
	return got, nil
}

// trimFloat formata um numero sem casas decimais desnecessarias (2.5 fica 2.5, 0.0 fica 0, 68.0 fica 68)
func trimFloat(f float64) string {
	if f == float64(int64(f)) {
		return fmt.Sprintf("%d", int64(f))
	}
	return fmt.Sprintf("%g", f)
}

func post(msg map[string]any) {
	js.Global().Call("postMessage", msg)
}

func parse(file js.Value) {
	defer func() {
		if r := recover(); r != nil {
			post(map[string]any{"type": "error", "message": fmt.Sprint("falha inesperada: ", r)})
		}
	}()

	fr := &fileReader{
		file: file,
		sync: js.Global().Get("FileReaderSync").New(),
		size: int64(file.Get("size").Float()),
	}
	if fr.size == 0 {
		post(map[string]any{"type": "error", "message": "o arquivo está vazio"})
		return
	}

	p := demoinfocs.NewParser(bufio.NewReaderSize(fr, 8<<20))
	defer p.Close()

	players := map[uint64]*PlayerInfo{}
	lastPct := -1

	p.RegisterEventHandler(func(e events.FrameDone) {
		if pct := int(fr.off * 100 / fr.size); pct != lastPct {
			lastPct = pct
			post(map[string]any{"type": "progress", "value": pct})
		}

		for _, pl := range p.GameState().Participants().Playing() {
			if pl.SteamID64 == 0 {
				continue
			}
			info, ok := players[pl.SteamID64]
			if !ok {
				info = &PlayerInfo{Name: pl.Name, SteamID: pl.SteamID64}
				players[pl.SteamID64] = info
			}
			if cc := pl.CrosshairCode(); cc != "" {
				info.CrosshairCode = cc
			}
			vm := pl.ViewmodelOffset()
			if vm.X != 0 || vm.Y != 0 || vm.Z != 0 {
				info.ViewmodelX = vm.X
				info.ViewmodelY = vm.Y
				info.ViewmodelZ = vm.Z
				info.ViewmodelFOV = pl.ViewmodelFOV()
				// formata como comandos de console, no estilo que o CS2 usa
				info.ViewmodelCmd = fmt.Sprintf(
					"viewmodel_fov %s; viewmodel_offset_x %s; viewmodel_offset_y %s; viewmodel_offset_z %s;",
					trimFloat(float64(info.ViewmodelFOV)), trimFloat(vm.X), trimFloat(vm.Y), trimFloat(vm.Z),
				)
			}
		}
	})

	parseErr := p.ParseToEnd()
	if parseErr != nil && len(players) == 0 {
		post(map[string]any{"type": "error", "message": "não consegui ler este arquivo (" + parseErr.Error() + ")"})
		return
	}
	// alguns demos terminam com erro no ultimo tick; se ja temos jogadores, seguimos

	result := make([]*PlayerInfo, 0, len(players))
	for _, v := range players {
		result = append(result, v)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })

	data, err := json.Marshal(result)
	if err != nil {
		post(map[string]any{"type": "error", "message": err.Error()})
		return
	}
	post(map[string]any{"type": "result", "json": string(data)})
}

func main() {
	js.Global().Set("parseDemo", js.FuncOf(func(this js.Value, args []js.Value) any {
		go parse(args[0])
		return nil
	}))
	post(map[string]any{"type": "ready"})
	select {} // mantem o programa vivo esperando arquivos
}
