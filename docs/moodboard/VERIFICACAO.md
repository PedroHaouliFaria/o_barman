# Verificação técnica do moodboard

Em 24 de novembro de 2026, a prancha foi aberta pelo caminho local `docs/moodboard/index.html` no Google Chrome 158.0.8127.38 em macOS. Pelo protocolo DevTools, a rede ficou em modo offline antes de cada navegação.

| Ensaio | Resultado observado | Estado |
|---|---|---|
| Desktop, janela de 1440 × 1024 | Documento carregado. Oito elementos de imagem decodificados, quatro arquivos distintos. Largura do documento de 1440 px. Captura integral examinada, incluindo paletas e créditos. | Passou |
| Tela estreita, janela de 390 × 844 | Documento carregado. Oito elementos de imagem decodificados. Largura do documento de 390 px. | Passou |
| Identificação e procedência | Quatro arquivos JPEG abertos e inspecionados. Autor, título e situação de direitos verificados na ficha de cada reprodução. Links para as fichas estão junto das imagens. | Passou |

Durante a pesquisa, a consulta direta à API do Art Institute of Chicago encontrou erro de certificado no Python e HTTP 403 pelo curl. Uma solicitação da página da National Gallery pelo curl também recebeu 403. A pesquisa prosseguiu pelas páginas institucionais acessíveis e pela API do Wikimedia Commons, que retornou os registros e os arquivos efetivamente utilizados. A consulta inicial a um endereço de miniatura construído manualmente retornou 404. A coleta final usou os endereços devolvidos pela API.

Para repetir a verificação, abra o HTML em um navegador, desligue a rede e recarregue a página. As obras, os quatro tratamentos de luz, os créditos e os comentários devem continuar visíveis. Os links de procedência requerem conexão ao serem abertos. A escolha artística da equipe continua aberta à discussão.
