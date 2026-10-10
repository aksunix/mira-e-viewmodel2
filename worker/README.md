# Busca de jogador (FACEIT + HLTV)

Pequeno Cloudflare Worker (plano gratuito) usado pela aba de pesquisa do site.

1. Crie uma chave em https://developers.faceit.com (Server-side API key).
2. `cd worker && npx wrangler login && npx wrangler secret put FACEIT_API_KEY && npx wrangler deploy`
3. Copie a URL gerada (`https://cs2-player-lookup.<usuario>.workers.dev`) para `docs/config.js` em `window.PLAYER_API` e faça push.

Obs.: a HLTV não tem API e usa Cloudflare anti-bot; o scraping pode ser bloqueado de tempos em tempos.
Quando isso acontece o site mostra um aviso e um link direto para o perfil na HLTV.
