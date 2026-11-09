import type { Db } from './db.ts';

/*
 * One-time upgrade of the demo catalogue: real photos, Portuguese copy and proper specification
 * tables. It runs once per database (tracked by `content_version`) and only touches values that
 * are still the original demo ones, so anything edited in the admin panel is left alone.
 */
const CONTENT_VERSION = '2';

type Spec = 'display' | 'chip' | 'camera' | 'storage' | 'ai' | 'updates' | 'port' | 'audio' | 'anc' | 'adaptive' | 'case' | 'battery' | 'multipoint' | 'calls'
  | 'water' | 'power' | 'ssd' | 'graphics' | 'grip' | 'dpad' | 'share' | 'wireless' | 'sensor' | 'buttons' | 'weights' | 'lighting' | 'switches' | 'polling'
  | 'keycaps' | 'ram' | 'tech' | 'charging' | 'plug' | 'material' | 'length' | 'cert' | 'surface' | 'magsafe' | 'protection' | 'finish' | 'lining' | 'glass'
  | 'fit' | 'install' | 'pack' | 'gesture' | 'pen' | 'party' | 'angle' | 'mount';

const SPEC_LABELS: Record<Spec, [string, string]> = {
  display: ['Display', 'Ecrã'], chip: ['Processor', 'Processador'], camera: ['Camera', 'Câmara'], storage: ['Storage', 'Armazenamento'],
  ai: ['Smart features', 'Funcionalidades inteligentes'], updates: ['Software updates', 'Atualizações de software'], port: ['Connector', 'Ligação'],
  audio: ['Audio', 'Áudio'], anc: ['Noise cancelling', 'Cancelamento de ruído'], adaptive: ['Listening modes', 'Modos de audição'], case: ['Charging case', 'Estojo de carga'],
  battery: ['Battery life', 'Autonomia'], multipoint: ['Connectivity', 'Conectividade'], calls: ['Calls', 'Chamadas'], water: ['Water resistance', 'Resistência à água'],
  power: ['Performance', 'Desempenho'], ssd: ['Storage', 'Armazenamento'], graphics: ['Graphics', 'Gráficos'], grip: ['Grip', 'Pega'], dpad: ['D-pad', 'Direcional'],
  share: ['Sharing', 'Partilha'], wireless: ['Wireless', 'Sem fios'], sensor: ['Sensor', 'Sensor'], buttons: ['Buttons', 'Botões'], weights: ['Weight', 'Peso'],
  lighting: ['Lighting', 'Iluminação'], switches: ['Switches', 'Teclas'], polling: ['Polling rate', 'Taxa de resposta'], keycaps: ['Keycaps', 'Capas das teclas'],
  ram: ['Memory', 'Memória'], tech: ['Technology', 'Tecnologia'], charging: ['Charging', 'Carregamento'], plug: ['Plug', 'Ficha'], material: ['Material', 'Material'],
  length: ['Length', 'Comprimento'], cert: ['Certification', 'Certificação'], surface: ['Surface', 'Superfície'], magsafe: ['Compatibility', 'Compatibilidade'],
  protection: ['Protection', 'Proteção'], finish: ['Finish', 'Acabamento'], lining: ['Lining', 'Forro'], glass: ['Glass', 'Vidro'], fit: ['Fit', 'Compatibilidade'],
  install: ['Installation', 'Instalação'], pack: ['Pack contents', 'Conteúdo'], gesture: ['Gestures', 'Gestos'], pen: ['Stylus', 'Caneta'], party: ['Pairing', 'Emparelhamento'],
  angle: ['Adjustment', 'Ajuste'], mount: ['Mounting', 'Fixação'],
};

/** slug -> [Portuguese name or '', short description, features, spec row label for each feature] */
const PRODUCTS: Record<string, [string, string, string[], Spec[]]> = {
  'iphone-15-pro': ['', 'Design em titânio, chip A17 Pro e um sistema de câmaras profissional.', ['Ecrã Super Retina XDR de 6,1"', 'Chip A17 Pro', 'Sistema de câmaras Pro', 'Até 1 TB de armazenamento'], ['display', 'chip', 'camera', 'storage']],
  'samsung-galaxy-s24': ['', 'O Galaxy AI chegou. Câmara extraordinária e bateria para todo o dia.', ['Dynamic AMOLED 2X de 6,2"', 'Snapdragon 8 Gen 3', 'Câmara tripla de 50 MP', 'Funcionalidades Galaxy AI'], ['display', 'chip', 'camera', 'ai']],
  'google-pixel-8': ['', 'O telemóvel prestável criado pela Google, com o melhor da IA da Google.', ['Ecrã Actua de 6,2"', 'Google Tensor G3', 'Câmara principal de 50 MP', '7 anos de atualizações do sistema'], ['display', 'chip', 'camera', 'updates']],
  'iphone-15': ['', 'Dynamic Island, câmara principal de 48 MP e USB-C.', ['Super Retina XDR de 6,1"', 'Chip A16 Bionic', 'Câmara principal de 48 MP', 'USB-C'], ['display', 'chip', 'camera', 'port']],
  'airpods-pro-2': ['', 'Até 2x mais cancelamento ativo de ruído, com Áudio Adaptativo.', ['Cancelamento ativo de ruído', 'Áudio Adaptativo', 'Estojo MagSafe USB-C', 'Até 6 horas de audição'], ['anc', 'adaptive', 'case', 'battery']],
  'sony-wh-1000xm5': ['', 'Auscultadores sem fios com cancelamento de ruído de referência.', ['Cancelamento de ruído de referência', 'Bateria de 30 horas', 'Ligação multiponto', 'Chamadas com som nítido'], ['anc', 'battery', 'multipoint', 'calls']],
  'samsung-galaxy-buds2-pro': ['', 'Áudio Hi-Fi de 24 bits com cancelamento de ruído inteligente.', ['Áudio Hi-Fi de 24 bits', 'Cancelamento de ruído inteligente', 'Resistência à água IPX7'], ['audio', 'anc', 'water']],
  'xbox-series-x': ['', 'A Xbox mais rápida e potente de sempre.', ['12 teraflops de potência', 'SSD personalizado de 1 TB', '4K real até 120 FPS'], ['power', 'ssd', 'graphics']],
  'xbox-wireless-controller': ['Comando sem fios Xbox', 'Experimente o design modernizado do Comando sem fios Xbox.', ['Pega texturada', 'Direcional híbrido', 'Botão Partilhar', 'Bluetooth'], ['grip', 'dpad', 'share', 'wireless']],
  'logitech-g502-mouse': ['Rato Logitech G502', 'Rato de gaming icónico com sensor HERO 25K.', ['Sensor HERO 25K', '11 botões programáveis', 'Pesos ajustáveis', 'LIGHTSYNC RGB'], ['sensor', 'buttons', 'weights', 'lighting']],
  'razer-huntsman-v2': ['', 'Teclado ótico de gaming com latência quase nula.', ['Teclas óticas Razer', 'Taxa de resposta de 8000 Hz', 'Capas PBT Doubleshot'], ['switches', 'polling', 'keycaps']],
  'dell-xps-13-laptop': ['Portátil Dell XPS 13', 'Deslumbrante ecrã InfinityEdge de 13,4" num design compacto.', ['InfinityEdge FHD+ de 13,4"', 'Intel Core Ultra 7', '16 GB de RAM', 'SSD de 512 GB'], ['display', 'chip', 'ram', 'storage']],
  'macbook-air-13-m3': ['', 'Incrivelmente fino e rápido com o chip M3.', ['Chip Apple M3', 'Liquid Retina de 13,6"', 'Até 18 horas de bateria', '8 GB de memória unificada'], ['chip', 'display', 'battery', 'ram']],
  'lenovo-ideapad-slim-5': ['', 'Desempenho para o dia a dia num corpo fino e leve.', ['OLED WUXGA de 14"', 'AMD Ryzen 7', '16 GB de RAM', 'SSD de 512 GB'], ['display', 'chip', 'ram', 'storage']],
  'usb-c-charger-65w': ['Carregador USB-C de 65 W', 'Carregador GaN compacto para telemóveis, tablets e portáteis.', ['Tecnologia GaN', 'Carregamento rápido de 65 W', 'Ficha rebatível'], ['tech', 'charging', 'plug']],
  'usb-c-to-usb-c-cable-2m': ['Cabo USB-C para USB-C de 2 m', 'Cabo entrançado resistente com carregamento de 100 W.', ['Power Delivery de 100 W', 'Nylon entrançado', '2 metros de comprimento'], ['charging', 'material', 'length']],
  'wireless-charging-pad-15w': ['Base de carregamento sem fios de 15 W', 'Carregamento Qi rápido para todos os telemóveis compatíveis.', ['Certificação Qi', 'Carregamento sem fios rápido de 15 W', 'Superfície antiderrapante'], ['cert', 'charging', 'surface']],
  'iphone-15-pro-case': ['Capa para iPhone 15 Pro', 'Capa protetora fina compatível com MagSafe.', ['Compatível com MagSafe', 'Rebordo elevado para a câmara', 'Proteção contra quedas'], ['magsafe', 'finish', 'protection']],
  'galaxy-s24-silicone-case': ['Capa de silicone para Galaxy S24', 'Capa de silicone suave ao toque da Samsung.', ['Acabamento suave ao toque', 'Forro em microfibra'], ['finish', 'lining']],
  'screen-protector-2-pack': ['Protetor de ecrã (pack de 2)', 'Vidro temperado 9H com moldura de fácil aplicação.', ['Vidro temperado 9H', 'Compatível com capas', 'Moldura de fácil aplicação', 'Pack de 2'], ['glass', 'fit', 'install', 'pack']],
  'apple-watch-series-9': ['', 'Mais inteligente, mais brilhante e mais poderoso.', ['Chip S9 SiP', 'Gesto de duplo toque', 'Ecrã Retina sempre ligado'], ['chip', 'gesture', 'display']],
  'samsung-galaxy-tab-s9': ['', 'Tablet Dynamic AMOLED 2X com S Pen incluída.', ['Dynamic AMOLED 2X de 11"', 'S Pen incluída', 'Resistência à água IP68'], ['display', 'pen', 'water']],
  'jbl-flip-6-speaker': ['Coluna JBL Flip 6', 'Som arrojado para todas as aventuras. À prova de água e de pó.', ['À prova de água IP67', '12 horas de reprodução', 'PartyBoost'], ['water', 'battery', 'party']],
  'magnetic-car-mount': ['Suporte magnético para automóvel', 'Suporte MagSafe seguro para a grelha de ventilação.', ['Compatível com MagSafe', 'Ângulo ajustável', 'Fixação à grelha de ventilação'], ['magsafe', 'angle', 'mount']],
};

const GALLERY: Record<string, number> = { 'iphone-15-pro': 3 };

const CATEGORIES: Record<string, [string, string]> = {
  'mobile-phones': ['Telemóveis', 'Telemóveis'],
  accessories: ['Acessórios', 'Acessórios'],
  headphones: ['Auscultadores e auriculares', 'Auscultadores'],
  gaming: ['Gaming', 'Gaming'],
  laptops: ['Portáteis', 'Portáteis'],
  'chargers-cables': ['Carregadores e cabos', ''],
  'mobile-covers': ['Capas para telemóvel', ''],
  'screen-protectors': ['Protetores de ecrã', ''],
  others: ['Outros', ''],
};

const PAGES: Record<string, [string, string, string]> = {
  about: ['Sobre nós', 'O seu parceiro de tecnologia de confiança no Reino Unido', `A Startech Mobile é uma loja de eletrónica sediada no Reino Unido, com os mais recentes telemóveis, acessórios, equipamento de gaming, portáteis e serviços de reparação especializados.

Estamos empenhados em oferecer produtos genuínos, preços competitivos e um excelente serviço ao cliente, online e na loja.

Os nossos técnicos reparam todos os dias telemóveis, tablets, portáteis e consolas, com peças de qualidade e a garantia das nossas reparações.`],
  'about-why': ['Porquê escolher-nos?', '', `- Vasta gama das melhores marcas
- Preços competitivos
- Entrega rápida e fiável
- Serviços de reparação profissionais
- Apoio dedicado ao cliente`],
  terms: ['Termos e Condições', 'Última atualização: outubro de 2026', `## 1. Introdução
Estes termos aplicam-se a todas as compras e marcações de reparação efetuadas na Startech Mobile. Ao fazer uma encomenda, aceita estes termos.

## 2. Encomendas e pagamento
Todos os preços são apresentados em euros (EUR) e incluem IVA. Uma encomenda é aceite quando a confirmamos por email. Reservamo-nos o direito de cancelar encomendas em caso de falta de stock ou de erros de preço.

## 3. Entrega
Entregamos em todo o Reino Unido. Os prazos de entrega estimados são apresentados na finalização da compra e não são garantidos.

## 4. Devoluções e reembolsos
Pode devolver a maioria dos artigos no prazo de 14 dias após a entrega. Consulte a nossa política de Devoluções e Reembolsos para mais informações.

## 5. Reparações
Os orçamentos de reparação são fornecidos após inspeção. As reparações têm uma garantia de 90 dias em peças e mão de obra.

## 6. Responsabilidade
Nada nestes termos limita os seus direitos legais enquanto consumidor.`],
  privacy: ['Política de Privacidade', 'Como cuidamos dos seus dados pessoais', `## 1. O que recolhemos
Recolhemos as informações que nos fornece ao criar uma conta, fazer uma encomenda, marcar uma reparação ou contactar-nos, como o seu nome, email, número de telefone e morada de entrega.

## 2. Como utilizamos as suas informações
- Para processar e entregar as suas encomendas
- Para gerir as suas marcações de reparação
- Para responder aos seus pedidos
- Para cumprir as nossas obrigações legais

## 3. Segurança dos dados
As palavras-passe são guardadas com um método forte de hashing unidirecional. Os seus dados nunca são vendidos a terceiros.

## 4. Os seus direitos
Ao abrigo do UK GDPR, pode pedir o acesso, a correção ou a eliminação dos seus dados pessoais em qualquer altura, contactando-nos.`],
  returns: ['Devoluções e Reembolsos', 'Devoluções em 14 dias, sem complicações', `## Devolver um artigo
Pode devolver a maioria dos produtos no prazo de **14 dias** após a entrega e receber o reembolso total, desde que não tenham sido utilizados e estejam na embalagem original.

## Como devolver
- Contacte-nos com o número da encomenda
- Embale o artigo em segurança
- Enviar-lhe-emos uma etiqueta de devolução

## Reembolsos
Os reembolsos são efetuados no método de pagamento original no prazo de 5 dias úteis após recebermos o artigo.

## Artigos com defeito
Se o seu artigo tiver defeito, contacte-nos e procederemos à reparação, substituição ou reembolso, de acordo com os seus direitos legais.`],
  delivery: ['Informações de Entrega', 'Entrega rápida no Reino Unido', `## Entrega normal
Grátis em encomendas acima de 59,93 €. Caso contrário, aplica-se uma pequena taxa de entrega, indicada na finalização da compra.

## Prazos de entrega
As encomendas feitas antes das 14h, de segunda a sexta-feira, são normalmente expedidas no próprio dia e entregues em 1 a 3 dias úteis.

## Levantamento em loja
Também pode levantar a sua encomenda na nossa loja de Londres.`],
  faqs: ['Perguntas Frequentes', 'As dúvidas mais comuns', `## Os vossos produtos são genuínos?
Sim. Todos os produtos que vendemos são novos e genuínos, salvo indicação clara em contrário.

## Quanto tempo demora a reparação de um ecrã?
A maioria das reparações de ecrãs de telemóvel fica concluída no próprio dia, muitas vezes em menos de uma hora.

## Posso seguir a minha encomenda?
Sim. Inicie sessão na sua conta ou utilize a página Seguir Encomenda com o número da encomenda e o seu email.

## As reparações têm garantia?
Todas as reparações têm uma garantia de 90 dias em peças e mão de obra.`],
};

const labelled = (specs: Spec[], features: string[], brand: string, lang: 0 | 1) => [
  `${lang ? 'Marca' : 'Brand'}: ${brand}`,
  ...specs.map((s, i) => `${SPEC_LABELS[s][lang]}: ${features[i]}`),
  lang ? 'Garantia: 1 ano do fabricante' : 'Warranty: 1 year manufacturer',
].join('\n');

export function applyContent({ get, run, tx }: Db) {
  if (get("SELECT 1 AS x FROM settings WHERE key = 'content_version' AND value = ?", CONTENT_VERSION)) return;
  tx(() => {
    for (const [slug, [name, short, features, specs]] of Object.entries(PRODUCTS)) {
      const p = get<{ id: number; brand: string; features: string; short_desc: string; name: string }>('SELECT id, brand, features, short_desc, name FROM products WHERE slug = ?', slug);
      if (!p) continue;
      if (slug === 'iphone-15-pro') run("UPDATE products SET features = replace(features, '256GB storage', 'Up to 1TB storage') WHERE id = ?", p.id);
      const en = (get<{ features: string }>('SELECT features FROM products WHERE id = ?', p.id)!).features.split('\n');
      run("UPDATE products SET specs = ? WHERE id = ? AND specs LIKE '%Highlight:%'", labelled(specs, en, p.brand, 0), p.id);
      run(`UPDATE products SET name_pt = CASE WHEN name_pt = '' THEN ? ELSE name_pt END,
             short_desc_pt = CASE WHEN short_desc_pt = '' THEN ? ELSE short_desc_pt END,
             description_pt = CASE WHEN description_pt = '' THEN ? ELSE description_pt END,
             features_pt = CASE WHEN features_pt = '' THEN ? ELSE features_pt END,
             specs_pt = CASE WHEN specs_pt = '' THEN ? ELSE specs_pt END WHERE id = ?`,
        name, short, `${short}\n\nDisponível agora na Startech Mobile, com entrega rápida no Reino Unido, devoluções em 14 dias e apoio especializado após a compra.`,
        features.join('\n'), labelled(specs, features, p.brand, 1), p.id);

      // Swap the demo drawing for the photo, unless the admin has already uploaded their own.
      const demo = `/img/products/${slug}.svg`;
      const changed = run('UPDATE product_images SET path = ?, thumb = ?  WHERE product_id = ? AND path = ?', `/img/products/${slug}.webp`, `/img/products/${slug}-t.webp`, p.id, demo).changes;
      for (let n = 2; changed && n <= (GALLERY[slug] ?? 1); n++) {
        run('INSERT INTO product_images (product_id, path, thumb, sort_order) VALUES (?, ?, ?, ?)', p.id, `/img/products/${slug}-${n}.webp`, `/img/products/${slug}-${n}-t.webp`, n - 1);
      }
    }
    for (const [slug, [name, nav]] of Object.entries(CATEGORIES)) {
      run(`UPDATE categories SET name_pt = CASE WHEN name_pt = '' THEN ? ELSE name_pt END,
             nav_label_pt = CASE WHEN nav_label_pt = '' THEN ? ELSE nav_label_pt END WHERE slug = ?`, name, nav, slug);
      run('UPDATE categories SET image = ? WHERE slug = ? AND image = ?', `/img/products/cat-${slug}.webp`, slug, `/img/products/cat-${slug}.svg`);
    }
    for (const [slug, [title, subtitle, body]] of Object.entries(PAGES)) {
      run(`UPDATE pages SET title_pt = CASE WHEN title_pt = '' THEN ? ELSE title_pt END,
             subtitle_pt = CASE WHEN subtitle_pt = '' THEN ? ELSE subtitle_pt END,
             body_pt = CASE WHEN body_pt = '' THEN ? ELSE body_pt END WHERE slug = ?`, title, subtitle, body, slug);
    }
    run(`INSERT INTO settings (key, value) VALUES ('content_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, CONTENT_VERSION);
  });
}
