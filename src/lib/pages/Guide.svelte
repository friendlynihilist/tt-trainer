<script>
  // Guida: il metodo in una pagina. In vista i cinque passi; il resto (medaglie, livello, durante
  // l'allenamento, il piano, la libreria, i dati) in sezioni chiuse, una per argomento. Qui stanno
  // le spiegazioni lunghe tolte dalle altre pagine.
  import { app } from '../store/app.svelte.js';
  import { BLOCKS, CYCLE_BLOCKS, PHASES, MATCH_TYPES, SCHEMES, PAUSE_MINUTES } from '../data/program.js';
  import { LIBRARY, PLAYER_LEVELS, TIERS, TIER } from '../data/library.js';
  import PageHead from '../ui/PageHead.svelte';
  import MedalBadge from '../ui/MedalBadge.svelte';
  import LevelBadge from '../ui/LevelBadge.svelte';
  import Collapse from '../ui/Collapse.svelte';

  const STEPS = [
    ['Il tuo livello', 'Scegli il livello che ti somiglia di più. Serve solo a proporti esercizi adatti: puoi fare qualsiasi esercizio, a qualsiasi livello.'],
    ['Allenarsi', 'Apri Oggi e tocca Inizia: trovi l’allenamento in calendario, già composto con gli esercizi del mese, e il timer. Il modello e ogni esercizio si cambiano al volo.'],
    ['Provare un obiettivo', 'Su ogni esercizio puoi toccare «Prova l’obiettivo»: l’app ti mostra il prossimo gradino da prendere, per esempio «Raggiungi l’argento! 10 di fila».'],
    ['Misurarsi', 'Il test è un appuntamento a parte, solo per misurarsi. L’app propone gli esercizi da misurare e ti dice perché. Puoi aggiungerne altri.'],
    ['Alla fine', 'Segna il colpo da correggere: l’app propone un esercizio per lavorarci e te lo ricorda.']
  ];
  const example = LIBRARY.find((e) => e.id === 'top-d-block');
</script>

<div class="page enter guide">
  <PageHead eyebrow="Guida" title="Come funziona" actions={false} />
  <p class="intro">Un colpo al mese, gli allenamenti che vuoi, una medaglia per ogni traguardo. Niente è bloccato.</p>

  <ol class="steps">
    {#each STEPS as [title, text], i (title)}
      <li>
        <span class="n t-num">{i + 1}</span>
        <div><strong>{title}</strong><p>{text}</p></div>
      </li>
    {/each}
  </ol>

  <div class="topics">
    <Collapse title="Le medaglie" open={false} key="guida-medaglie">
      <p>Ogni esercizio ha tre gradini, a volte quattro. Per esempio, nel top di dritto contro block:</p>
      <div class="medals">
        {#each TIERS.filter((t) => example.goals[t]) as t (t)}
          <div class="md">
            <MedalBadge tier={t} size={40} label={false} />
            <strong>{TIER[t].name}</strong>
            <span>{example.goals[t]} di fila</span>
          </div>
        {/each}
      </div>
      <ul class="rules">
        <li>Quando conti quante di fila hai tre tentativi per seduta, e vale il migliore. Se sbaglia il compagno, il tentativo non conta: ripetilo.</li>
        <li>Quando conti su 10 o su 20 vale la prima serie del giorno: non si ripete finché esce il numero giusto.</li>
        <li>L’oro chiede la soglia in due giorni diversi. Con un giorno solo hai «metà oro».</li>
        <li>Le medaglie non si perdono. Se non misuri un esercizio da 90 giorni, l’app lo segna «da ripassare».</li>
        <li>Puoi dare un voto alla qualità del colpo, da 0 a 5. Non cambia la medaglia.</li>
      </ul>
    </Collapse>

    <Collapse title="Il livello" open={false} key="guida-livello">
      <div class="card flush list">
        {#each PLAYER_LEVELS as l (l.id)}
          <div class="lvl" class:me={l.id === app.player.level}>
            <LevelBadge level={l.id} small />
            <span class="small">{l.about}</span>
          </div>
        {/each}
      </div>
      <ul class="rules">
        <li>Ogni livello ha i suoi esercizi chiave.</li>
        <li>L’app ti propone il livello dopo quando hai l’argento nel 75% degli esercizi chiave, con almeno un argento in ogni famiglia, e l’oro nel 40%.</li>
        <li>Queste misure devono venire da almeno 4 sedute, in almeno 14 giorni: è la costanza.</li>
        <li>Puoi dire di no: la proposta torna dopo 21 giorni, o prima se prendi 3 ori nuovi.</li>
      </ul>
    </Collapse>

    <Collapse title="Durante l’allenamento" open={false} key="guida-sessione">
      <div class="bar" role="img" aria-label="Le cinque fasi del modello Completo">
        {#each PHASES as p (p.id)}<span style:flex={p.minutes} class:hot={p.id.startsWith('ex')}></span>{/each}
      </div>
      <div class="card flush list phases">
        <div class="ph"><b class="t-num">10′</b><span><strong>Riscaldamento</strong>Dritto e rovescio in diagonale, top su block. Dal secondo mese gli ultimi 5 minuti sono il mantenimento del mese prima.</span></div>
        <div class="ph"><b class="t-num">14′</b><span><strong>Servizi e ricezione</strong>Metà tempo serve uno, metà l’altro. Chi non serve allena la ricezione.</span></div>
        <div class="ph"><b class="t-num">24′</b><span><strong>Esercizio 1</strong>Il primo percorso del mese: l’app propone il primo esercizio che non ha ancora l’argento.</span></div>
        <div class="ph"><b class="t-num">24′</b><span><strong>Esercizio 2</strong>Il secondo percorso del mese, allo stesso modo.</span></div>
        <div class="ph"><b class="t-num">14′</b><span><strong>Partitella</strong>Metà tempo {MATCH_TYPES.risk.name.toLowerCase()}: {MATCH_TYPES.risk.text.charAt(0).toLowerCase() + MATCH_TYPES.risk.text.slice(1)} Metà tempo {MATCH_TYPES.scheme.name.toLowerCase()}: si sceglie uno schema.</span></div>
      </div>
      <ul class="rules">
        <li><b>Il cambio.</b> A metà di ogni esercizio in due suona un doppio bip e il riquadro del tempo diventa scuro: tocca al compagno. Se comincia lui, tocca l’etichetta «Tocca a te» e i turni si invertono. Nel palleggio e negli esercizi da solo non c’è cambio.</li>
        <li><b>Le pause.</b> Fra una fase e l’altra c’è {PAUSE_MINUTES} minuto di pausa, con il conto alla rovescia. Si può saltare. Il minuto si toglie alla fase dopo: il totale non cambia.</li>
      </ul>
    </Collapse>

    <Collapse title="Il piano" open={false} key="guida-piano">
      <p>Il piano è una fila di tappe: per ognuna scegli su cosa lavori e per quanto, un allenamento o una, due o quattro settimane. Il programma di base dura tre mesi:</p>
      <div class="card flush list">
        {#each CYCLE_BLOCKS as b (b)}
          {@const block = BLOCKS[b]}
          <div class="month">
            <span class="big t-num">{b}</span>
            <span><strong>{block.theme}</strong><span class="small muted block">{block.tracks.map((t) => app.catalog.track(t).short).join(', ')}</span></span>
          </div>
        {/each}
      </div>
      <p class="small muted">Una settimana saltata? Nel piano metti una pausa e tutto slitta in avanti.</p>
    </Collapse>

    <Collapse title="La libreria" open={false} key="guida-libreria">
      <ul class="rules">
        <li><b>Esercizi.</b> {LIBRARY.length} esercizi in otto famiglie, con il livello suggerito, il formato, come deve venire, gli errori comuni e le medaglie.</li>
        <li><b>Modelli.</b> La scaletta di un allenamento. Ne crei quanti vuoi.</li>
        <li><b>Percorsi.</b> Una sequenza di esercizi, dal più guidato al più libero.</li>
        <li><b>Mesi.</b> Su cosa lavori: fino a tre percorsi, il mantenimento, i servizi e gli schemi della partitella.</li>
        <li>Si può anche importare un file preparato da un assistente.</li>
      </ul>
    </Collapse>

    <Collapse title="I tuoi dati" open={false} key="guida-dati">
      {#if app.cloud}
        <p>Diario, note, medaglie e livello li vedi solo tu. Il gruppo vede solo il tuo nome, se lo consenti.</p>
        <p class="small muted">Funziona anche senza rete: registra in palestra e sincronizza quando torna il segnale. Dal menu del browser puoi aggiungerla alla schermata Home.</p>
      {:else}
        <p>Modalità locale: i dati restano in questo browser. Da Impostazioni puoi esportarli.</p>
      {/if}
    </Collapse>
  </div>
</div>

<style>
  .intro {
    margin: 8px 0 0;
    font-size: 17px;
    color: var(--ink-2);
  }
  .steps {
    list-style: none;
    margin: 24px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .steps li {
    display: flex;
    gap: 14px;
    padding: 14px 16px;
    border-radius: var(--r-card);
    background: var(--card);
    border: 1px solid var(--line);
  }
  .n {
    display: grid;
    place-items: center;
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: 11px;
    background: var(--accent);
    color: #fff;
    font-size: 16px;
    font-weight: 800;
    box-shadow: 0 3px 0 color-mix(in srgb, var(--accent) 62%, #000);
  }
  .steps strong {
    display: block;
    font-size: 16px;
    font-weight: 700;
  }
  .steps p {
    margin: 2px 0 0;
    font-size: 14px;
    color: var(--ink-2);
  }
  .topics {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 24px;
  }
  .topics p {
    margin: 0 0 10px;
  }
  .medals {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    padding: 14px 6px;
    border-radius: var(--r-card);
    background: var(--card);
    border: 1px solid var(--line);
  }
  .md {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    text-align: center;
    font-size: 13px;
  }
  .md strong {
    margin-top: 6px;
  }
  .md span {
    color: var(--ink-3);
  }
  .rules {
    margin: 12px 0 4px;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 14px;
    color: var(--ink-2);
  }
  .rules b {
    color: var(--ink);
  }
  strong {
    font-weight: 700;
  }
  .block {
    display: block;
  }
  .lvl {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 12px 16px;
  }
  .lvl + .lvl {
    border-top: 1px solid var(--line);
  }
  .lvl.me {
    background: color-mix(in srgb, var(--accent) 8%, var(--card));
  }
  .bar {
    display: flex;
    gap: 3px;
    height: 10px;
    margin-bottom: 12px;
  }
  .bar span {
    border-radius: 5px;
    background: color-mix(in srgb, var(--ink) 35%, var(--sunk));
  }
  .bar span.hot {
    background: var(--accent);
  }
  .ph {
    display: flex;
    gap: 12px;
    padding: 12px 16px;
    font-size: 14px;
    color: var(--ink-2);
  }
  .ph + .ph {
    border-top: 1px solid var(--line);
  }
  .ph b {
    flex: none;
    width: 32px;
    color: var(--ink);
  }
  .ph strong {
    display: block;
    color: var(--ink);
  }
  .month {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 16px;
  }
  .month + .month {
    border-top: 1px solid var(--line);
  }
  .big {
    font-size: 28px;
    font-weight: 800;
    color: var(--accent);
  }
</style>
