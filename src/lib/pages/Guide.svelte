<script>
  // Guida: il metodo in una pagina. È il foglio «Come si usa», riscritto per l'app.
  import { app } from '../store/app.svelte.js';
  import { BLOCKS, CYCLE_BLOCKS, PHASES, TRACKS, GATE, VALID_ATTEMPT, NEXT_CYCLE } from '../data/program.js';
  import PageHead from '../ui/PageHead.svelte';
  import LevelDemo from '../ui/LevelDemo.svelte';

  const STEPS = [
    ['La prima volta', `Ogni esercizio parte con il test di partenza: livello 1, e con almeno ${app.rules.up} su 10 provi quello dopo. Il primo che non passi è il tuo.`],
    ['Allenarsi', 'Apri Oggi e tocca Inizia: trovi l’allenamento in calendario, già composto al tuo livello, con il timer. Il modello si cambia al volo.'],
    ['Misurarsi', 'Il test è un appuntamento a parte: fai 10 tentativi per ogni esercizio e segni ogni palla con un tocco. Quando capita nello stesso giorno di un allenamento, lo fai all’inizio di ogni esercizio.'],
    ['Quando vuoi', 'Allenamenti in più, test, lezioni, partite: dal «+» o dal Diario, in qualsiasi giorno. Si sposta e si toglie tutto, solo quell’appuntamento.'],
    ['Alla fine', 'Segna il colpo da correggere: l’app propone l’esercizio per lavorarci, te lo ricorda, e ne tiene conto quando compone le sessioni su misura.']
  ];
</script>

<div class="page enter">
  <PageHead eyebrow="Guida" title="Come funziona" sub="Mesi a tema, gli allenamenti che vuoi, e un test che decide il livello. Si sale solo quando il test lo dice." actions={false} />

  <section class="section">
    <ol class="steps">
      {#each STEPS as [title, text], i (title)}
        <li>
          <span class="n mono">{i + 1}</span>
          <div><strong>{title}</strong><p class="muted">{text}</p></div>
        </li>
      {/each}
    </ol>
  </section>

  <section class="section">
    <h2 class="heading">La regola dei livelli</h2>
    <div class="stack g-12">
      <LevelDemo up={app.rules.up} />
      <div class="card flush list">
        <div class="item"><span class="tag up">Sali</span><span class="grow">Due test di fila allo stesso livello con almeno {app.rules.up} su 10.</span></div>
        <div class="item"><span class="tag down">Scendi</span><span class="grow">Basta un test con {app.rules.down} o meno.</span></div>
        <div class="item"><span class="tag stay">Resta</span><span class="grow">In tutti gli altri casi.</span></div>
      </div>
      <p class="small muted">{VALID_ATTEMPT} Le soglie si cambiano in Impostazioni. Dove arrivi è il punto di partenza del ciclo dopo.</p>
    </div>
  </section>

  <section class="section">
    <h2 class="heading">Il modello Completo · 90 minuti</h2>
    <div class="bar" role="img" aria-label="Le cinque fasi">
      {#each PHASES as p (p.id)}<span style:flex={p.minutes} class:hot={p.id.startsWith('ex')}></span>{/each}
    </div>
    <div class="card flush list phases">
      <div class="item"><span class="mono min">10′</span><span class="grow"><strong>Riscaldamento</strong><span class="small muted block">Dritto e rovescio in diagonale, top su block. Dal mese 2 gli ultimi 5 minuti sono il mantenimento del mese prima.</span></span></div>
      <div class="item"><span class="mono min">15′</span><span class="grow"><strong>Servizi e ricezione</strong><span class="small muted block">Metà tempo serve uno, metà l’altro: a metà suona il cambio. Chi non serve allena la ricezione del mese.</span></span></div>
      <div class="item"><span class="mono min">25′</span><span class="grow"><strong>Esercizio 1</strong><span class="small muted block">Il primo percorso del mese, al livello raggiunto. Nel giorno del test comincia con il test.</span></span></div>
      <div class="item"><span class="mono min">25′</span><span class="grow"><strong>Esercizio 2</strong><span class="small muted block">Il secondo percorso del mese, come sopra.</span></span></div>
      <div class="item"><span class="mono min">15′</span><span class="grow"><strong>Partitella</strong><span class="small muted block">Set giocati con la regola del mese.</span></span></div>
    </div>
  </section>

  <section class="section">
    <h2 class="heading">Il programma di base · tre mesi</h2>
    <div class="stack g-8">
      {#each CYCLE_BLOCKS as b (b)}
        {@const block = BLOCKS[b]}
        <div class="card month">
          <span class="big mono">{b}</span>
          <div class="stack g-4">
            <strong>{block.theme}</strong>
            <p class="small muted">{block.tracks.map((t) => TRACKS[t].name).join(' · ')}</p>
            <p class="small">Partitella: {block.rule}</p>
          </div>
        </div>
      {/each}
    </div>
    <p class="small muted note">
      Il mese 3 si comincia solo con l’apertura su taglio almeno al livello {GATE.minLevel}, di dritto e di rovescio. Se non ci sei, l’app propone una
      settimana di recupero sulle due aperture. Una settimana saltata? Nel piano metti una pausa e tutto slitta.
    </p>
  </section>

  <section class="section">
    <h2 class="heading">Fatto su misura</h2>
    <div class="card flush list">
      <div class="item"><span class="grow"><strong>Modelli</strong><span class="small muted block">La scaletta di un allenamento: riscaldamento, servizi, esercizi del mese o fissi, esercizi liberi, partitella. Ne crei quanti vuoi, ognuno col suo colore.</span></span></div>
      <div class="item"><span class="grow"><strong>Percorsi</strong><span class="small muted block">Un esercizio con i suoi livelli (fino a 8) e il suo test su 10. Il livello si calcola come per quelli di base.</span></span></div>
      <div class="item"><span class="grow"><strong>Mesi</strong><span class="small muted block">Un tema con fino a tre percorsi, il mantenimento, i servizi e la regola della partitella. Li metti in fila quando crei un ciclo.</span></span></div>
      <div class="item"><span class="grow"><strong>Su misura</strong><span class="small muted block">Il suggeritore compone una sessione dal tuo livello, dal mese, e da quello che segni da correggere; e ti dice quali percorsi è ora di misurare.</span></span></div>
    </div>
    <p class="small muted note">Tutto dalla Libreria. Si può anche importare un file preparato da un assistente.</p>
  </section>

  <section class="section">
    <h2 class="heading">I tuoi dati</h2>
    <div class="card stack g-12">
      {#if app.cloud}
        <p>Diario, note ed errori li vedi solo tu. Il gruppo vede il nome e i livelli, se lo consenti: serve al compagno per sapere che esercizio farti fare.</p>
        <p class="muted">Funziona anche senza rete: registra in palestra e sincronizza quando torna il segnale. Dal menu del browser puoi aggiungerla alla schermata Home.</p>
      {:else}
        <p>Modalità locale: i dati restano in questo browser. Da Impostazioni puoi esportarli.</p>
      {/if}
    </div>
  </section>

  <section class="section">
    <h2 class="heading">Per il ciclo successivo</h2>
    <div class="chips">{#each NEXT_CYCLE as n (n)}<span class="tag line">{n}</span>{/each}</div>
  </section>
</div>

<style>
  .steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .steps li {
    display: grid;
    grid-template-columns: 32px 1fr;
    gap: 14px;
  }
  .n {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--ink);
    color: var(--paper);
    font-weight: 560;
    font-size: 14px;
  }
  strong {
    font-weight: 580;
  }
  .block {
    display: block;
  }
  .bar {
    display: flex;
    gap: 3px;
    height: 10px;
    margin-bottom: 12px;
  }
  .bar span {
    border-radius: 4px;
    background: var(--ink);
  }
  .bar span.hot {
    background: var(--accent);
  }
  .phases .item {
    align-items: flex-start;
  }
  .min {
    width: 30px;
    padding-top: 1px;
    color: var(--ink-2);
    font-size: 13px;
  }
  .month {
    display: grid;
    grid-template-columns: 40px 1fr;
    gap: 12px;
    align-items: start;
  }
  .big {
    font-size: 34px;
    line-height: 1;
    font-weight: 500;
    color: var(--accent);
  }
  .note {
    margin-top: 12px;
  }
  .item .tag {
    flex: none;
    width: 62px;
    justify-content: center;
  }
</style>
