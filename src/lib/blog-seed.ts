import type { Db } from './db.ts';

/*
 * The articles a new shop starts with. They are added once, by the migration in db.ts, and are then
 * ordinary rows edited in Admin -> Blog, so an article deleted there never comes back.
 */
const STARTER_POSTS = [
  {
    slug: 'cracked-phone-screen-what-to-do',
    published: '2026-11-09',
    image: '/img/photos/repairs.webp',
    category: 'Repairs',
    category_pt: 'Reparações',
    title: 'Cracked your phone screen? Do this first',
    title_pt: 'Partiu o ecrã do telemóvel? Comece por aqui',
    excerpt: 'A few simple steps protect your data and stop a small crack from turning into a bigger repair.',
    excerpt_pt: 'Alguns passos simples protegem os seus dados e evitam que uma pequena fissura se torne numa reparação maior.',
    body: `A cracked screen rarely stops a phone working straight away, which is why so many people keep using one for months. The damage can spread, though, and a screen that fails completely makes it much harder to rescue your photos and messages.

## Back up while you still can
If the touchscreen still responds, make a backup today. Use iCloud or Google, or copy your files to a computer. This is the most useful thing you can do, whatever happens next.

## Keep the damage from spreading
- Put a clear screen protector or a strip of tape over sharp cracks to protect your fingers
- Keep the phone away from water, as a cracked screen no longer seals properly
- Use a case until the repair is done, because another drop can damage the frame

## When to stop using it
Switch the phone off and bring it in if the screen is lifting away from the body, the back is bulging, or the phone is getting unusually hot. These can be signs of a swollen battery, and it should not be charged.

## What to expect from a repair
Most phone screen repairs are finished the same day, often in under an hour. Every repair comes with a **90-day warranty on parts and labour**, and we give you a quote after inspecting the device.`,
    body_pt: `Um ecrã partido raramente impede o telemóvel de funcionar de imediato, e é por isso que tantas pessoas continuam a usá-lo durante meses. No entanto, os danos podem alastrar, e um ecrã que deixa de funcionar por completo torna muito mais difícil recuperar as suas fotografias e mensagens.

## Faça uma cópia de segurança enquanto pode
Se o ecrã tátil ainda responder, faça hoje uma cópia de segurança. Utilize o iCloud ou o Google, ou copie os ficheiros para um computador. É o mais útil que pode fazer, aconteça o que acontecer a seguir.

## Evite que os danos alastrem
- Coloque um protetor de ecrã transparente ou fita adesiva sobre as fissuras cortantes para proteger os dedos
- Mantenha o telemóvel afastado da água, porque um ecrã partido já não veda como deve ser
- Use uma capa até à reparação, porque outra queda pode danificar a estrutura

## Quando deve deixar de o usar
Desligue o telemóvel e traga-o à loja se o ecrã se estiver a soltar da estrutura, se a parte de trás estiver saliente ou se o telemóvel aquecer de forma invulgar. Podem ser sinais de uma bateria inchada, e não a deve carregar.

## O que esperar da reparação
A maioria das reparações de ecrãs de telemóvel fica concluída no próprio dia, muitas vezes em menos de uma hora. Todas as reparações têm **garantia de 90 dias em peças e mão de obra**, e damos-lhe um orçamento depois de inspecionarmos o equipamento.`,
    cta_href: '/repairs',
    cta_label: 'Book a repair',
    cta_label_pt: 'Marcar reparação',
  },
  {
    slug: 'make-your-phone-battery-last',
    published: '2026-11-09',
    image: '/img/products/cat-mobile-phones.webp',
    category: 'Tips',
    category_pt: 'Dicas',
    title: 'How to make your phone battery last longer',
    title_pt: 'Como fazer a bateria do telemóvel durar mais',
    excerpt: 'Small charging habits add up, and they can keep a battery healthy for years. Here is what makes the difference.',
    excerpt_pt: 'Pequenos hábitos de carregamento fazem a diferença e podem manter a bateria saudável durante anos.',
    body: `Every lithium-ion battery slowly loses capacity as it ages. You cannot stop that, but you can slow it down, and you can get more from each charge along the way.

## Habits that protect the battery
- Keep it out of the heat: a sunny dashboard or a hot car does more harm than almost anything else
- Try not to run it down to zero on a regular basis
- Turn on your phone's optimised or adaptive charging, if it has one, so it avoids sitting at 100% all night
- Take off a thick case if the phone gets hot while charging

## Quick ways to get through the day
- Lower the screen brightness or use automatic brightness
- Check which apps use the most power in your battery settings
- Turn on low power mode when you know it will be a long day

## How to tell it is time for a new battery
On iPhone, look at the maximum capacity in Settings, under Battery. Many Android phones show similar information, though the location varies by brand. Whatever the number says, watch for the practical signs: the phone shuts down with charge remaining, the percentage jumps around, or it no longer lasts the day.

If the back of the phone is bulging, stop charging it and bring it to us. A battery replacement usually costs far less than a new phone.`,
    body_pt: `Todas as baterias de iões de lítio perdem capacidade com o tempo. Não é possível impedi-lo, mas pode abrandar o processo e aproveitar melhor cada carga.

## Hábitos que protegem a bateria
- Evite o calor: um tablier ao sol ou um carro quente fazem mais mal do que quase tudo o resto
- Tente não deixar a bateria chegar a zero com frequência
- Ative o carregamento otimizado ou adaptativo do telemóvel, se existir, para que não fique a 100% durante toda a noite
- Retire as capas grossas se o telemóvel aquecer durante o carregamento

## Formas rápidas de chegar ao fim do dia
- Reduza o brilho do ecrã ou utilize o brilho automático
- Veja nas definições da bateria quais são as aplicações que gastam mais energia
- Ative o modo de poupança de energia quando souber que o dia vai ser longo

## Como saber que precisa de uma bateria nova
No iPhone, veja a capacidade máxima em Definições, na secção Bateria. Muitos telemóveis Android mostram informação semelhante, embora o local varie consoante a marca. Seja qual for o número, esteja atento aos sinais práticos: o telemóvel desliga-se com carga restante, a percentagem oscila ou a bateria já não dura o dia inteiro.

Se a parte de trás do telemóvel estiver saliente, deixe de o carregar e traga-o à loja. Substituir a bateria costuma ficar muito mais barato do que comprar um telemóvel novo.`,
    cta_href: '/repairs',
    cta_label: 'Book a battery replacement',
    cta_label_pt: 'Marcar substituição de bateria',
  },
  {
    slug: 'choosing-the-right-usb-c-charger',
    published: '2026-11-09',
    image: '/img/products/cat-chargers-cables.webp',
    category: 'Buying guides',
    category_pt: 'Guias de compra',
    title: 'Choosing the right USB-C charger',
    title_pt: 'Como escolher o carregador USB-C certo',
    excerpt: 'Watts, GaN and Power Delivery in plain language, so you buy one charger that does the job.',
    excerpt_pt: 'Watts, GaN e Power Delivery em linguagem simples, para comprar um carregador que resolva o problema.',
    body: `USB-C connectors all look the same, but the chargers and cables behind them are not. Three things decide whether you get fast charging.

## Check the watts
Most phones charge at their top speed somewhere between 20 W and 45 W. Tablets often want a little more, and laptops usually need 45 W to 100 W. A charger with more watts than your device needs is safe, because the device only draws what it can use. One 65 W charger can often cover a phone and a laptop.

## Look for Power Delivery
USB Power Delivery, or PD, is the standard most modern phones and laptops use to agree on a charging speed. If a charger supports PD, it should work with most USB-C devices. Check your manual for anything that uses its own fast-charging standard.

## What GaN means
GaN, or gallium nitride, is a material that lets chargers run cooler and be much smaller. It does not charge your phone faster on its own, but it does mean a powerful charger can fit in your pocket.

## Do not forget the cable
A basic USB-C cable carries up to 60 W. For anything above that, such as a powerful laptop, you need a cable rated for **100 W or more**. For a phone, any good-quality cable will do.`,
    body_pt: `Os conectores USB-C são todos iguais, mas os carregadores e os cabos não. São três os fatores que determinam se tem ou não carregamento rápido.

## Verifique os watts
A maioria dos telemóveis atinge a velocidade máxima entre 20 W e 45 W. Os tablets costumam precisar de um pouco mais e os portáteis normalmente precisam de 45 W a 100 W. Um carregador com mais watts do que o equipamento precisa é seguro, porque o equipamento só consome o que consegue usar. Muitas vezes, um único carregador de 65 W serve para o telemóvel e para o portátil.

## Procure Power Delivery
O USB Power Delivery, ou PD, é a norma que a maioria dos telemóveis e portáteis atuais utiliza para definir a velocidade de carregamento. Um carregador com PD deverá funcionar com a maioria dos equipamentos USB-C. Consulte o manual se o seu equipamento utilizar uma norma própria de carregamento rápido.

## O que significa GaN
O GaN, ou nitreto de gálio, é um material que permite que os carregadores aqueçam menos e sejam muito mais pequenos. Por si só não carrega o telemóvel mais depressa, mas permite que um carregador potente caiba no bolso.

## Não se esqueça do cabo
Um cabo USB-C básico suporta até 60 W. Acima disso, por exemplo num portátil potente, precisa de um cabo preparado para **100 W ou mais**. Para um telemóvel, qualquer cabo de boa qualidade serve.`,
    cta_href: '/shop?category=chargers-cables',
    cta_label: 'Shop chargers and cables',
    cta_label_pt: 'Ver carregadores e cabos',
  },
  {
    slug: 'phone-case-and-screen-protector-guide',
    published: '2026-11-09',
    image: '/img/products/cat-screen-protectors.webp',
    category: 'Protection',
    category_pt: 'Proteção',
    title: 'Case or screen protector: do you need both?',
    title_pt: 'Capa ou protetor de ecrã: precisa dos dois?',
    excerpt: 'They protect against different things. Here is what each one does and how to choose well.',
    excerpt_pt: 'Protegem contra coisas diferentes. Saiba o que cada um faz e como escolher bem.',
    body: `The short answer is yes, if you want to keep your phone looking new. A case and a screen protector handle different kinds of damage, and together they cost much less than a repair.

## What a case does
A case absorbs the shock of a drop and protects the corners and frame, which are usually the first things to hit the ground. Look for a raised edge around the camera and the screen, so neither touches the surface when the phone is laid flat. If you use MagSafe accessories, choose a case that is compatible with them.

## What a screen protector does
A protector takes the scratches and small impacts that would otherwise mark the screen. Tempered glass feels closest to the real thing. A **9H** rating describes resistance to scratches, so it does not mean the glass is unbreakable.

## Getting a good fit
- Clean the screen with a microfibre cloth before you start
- Use the alignment frame if one is included
- Choose a protector that fits with a case, so the edges do not lift
- Replace it once it is cracked, as it has already done its job

If a drop gets past your protection, we can repair screens, batteries and charging ports in store.`,
    body_pt: `A resposta curta é sim, se quiser manter o telemóvel como novo. A capa e o protetor de ecrã protegem contra tipos de danos diferentes e, em conjunto, custam muito menos do que uma reparação.

## O que faz uma capa
A capa absorve o impacto de uma queda e protege os cantos e a estrutura, que costumam ser os primeiros a bater no chão. Procure um rebordo elevado à volta da câmara e do ecrã, para que nenhum deles toque na superfície quando o telemóvel está pousado. Se utilizar acessórios MagSafe, escolha uma capa compatível.

## O que faz um protetor de ecrã
O protetor fica com os riscos e os pequenos impactos que, de outra forma, marcariam o ecrã. O vidro temperado é o que mais se aproxima da sensação do ecrã original. A classificação **9H** indica a resistência aos riscos, pelo que não significa que o vidro seja inquebrável.

## Como obter uma boa aplicação
- Limpe o ecrã com um pano de microfibra antes de começar
- Utilize a moldura de aplicação, se vier incluída
- Escolha um protetor compatível com capas, para que as extremidades não levantem
- Substitua-o quando estiver partido, porque já cumpriu a sua função

Se uma queda for mais forte do que a proteção, reparamos ecrãs, baterias e entradas de carga na loja.`,
    cta_href: '/shop?category=screen-protectors',
    cta_label: 'Shop screen protectors',
    cta_label_pt: 'Ver protetores de ecrã',
  },
];

export function seedBlog({ run }: Pick<Db, 'run'>) {
  for (const p of STARTER_POSTS) {
    run(`INSERT OR IGNORE INTO blog_posts (slug, published, image, thumb, category, category_pt, title, title_pt, excerpt, excerpt_pt, body, body_pt, cta_href, cta_label, cta_label_pt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      p.slug, p.published, p.image, p.image, p.category, p.category_pt, p.title, p.title_pt, p.excerpt, p.excerpt_pt, p.body, p.body_pt, p.cta_href, p.cta_label, p.cta_label_pt);
  }
}
