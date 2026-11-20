<script>
  // Guida: il metodo in una pagina.
  import { app } from '../store/app.svelte.js';
  import { BLOCKS, CYCLE_BLOCKS, PHASES, MATCH_TYPES, SCHEMES, PAUSE_MINUTES } from '../data/program.js';
  import { LIBRARY, PLAYER_LEVELS, TIERS, TIER } from '../data/library.js';
  import PageHead from '../ui/PageHead.svelte';
  import Medal from '../ui/Medal.svelte';

  const STEPS = [
    ['Il tuo livello', 'Scegli il livello che ti somiglia di più. Serve solo a proporti esercizi adatti: puoi fare qualsiasi esercizio, a qualsiasi livello.'],
    ['Allenarsi', 'Apri Oggi e tocca Inizia: trovi l’allenamento in calendario, già composto con gli esercizi del mese, e il timer. Il modello e ogni esercizio si cambiano al volo.'],
    ['Provare un obiettivo', 'Su ogni esercizio puoi toccare «Prova l’obiettivo»: l’app ti mostra il prossimo gradino da prendere, per esempio «Raggiungi l’argento! 10 di fila».'],
    ['Misurarsi', 'Il test è un appuntamento a parte, solo per misurarsi. L’app propone gli esercizi da misurare e ti dice perché. Puoi aggiungerne altri.'],
    ['Alla fine', 'Segna il colpo da correggere: l’app propone un esercizio per lavorarci e te lo ricorda.']
  ];
  const example = LIBRARY.find((e) => e.id === 'top-d-block');
</script>

<div class="page enter">
  <PageHead eyebrow="Guida" title="Come funziona" sub="Mesi a tema, gli allenamenti che vuoi, e una medaglia per ogni traguardo. Niente è bloccato." actions={false} />

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
    <h2 class="heading">Le medaglie</h2>
    <div class="stack g-12">
      <p>Ogni esercizio ha tre gradini, a volte quattro. Per esempio, nel top di dritto contro block:</p>
      <div class="card flush list">
        {#each TIERS.filter((t) => example.goals[t]) as t (t)}
          <div class="item" data-tier={t}>
            <Medal tier={t} size={20} />
            <span class="grow"><strong>{TIER[t].name}</strong><span class="small muted block">{example.goals[t]} di fila{t === 'O' ? ', in due giorni diversi' : ''}</span></span>
          </div>
        {/each}
      </div>
      <ul class="rules small muted">
        <li>Quando conti quante di fila hai tre tentativi per seduta, e vale il migliore. Se sbaglia il compagno, il tentativo non conta: ripetilo.</li>
        <li>Quando conti su 10 o su 20 vale la prima serie del giorno: non si ripete finché esce il numero giusto.</li>
        <li>L’oro chiede la soglia in due giorni diversi. Con un giorno solo hai «metà oro».</li>
        <li>Le medaglie non si perdono. Se non misuri un esercizio da 90 giorni, l’app lo segna «da ripassare».</li>
        <li>Puoi dare un voto alla qualità del colpo, da 0 a 5. Non cambia la medaglia.</li>
      </ul>
    </div>
  </section>

  <section class="section">
    <h2 class="heading">Il livello</h2>
    <div class="stack g-12">
      <div class="card flush list">
        {#each PLAYER_LEVELS as l (l.id)}
          <div class="item lvl" class:me={l.id === app.player.level}>
            <span class="grow"><strong>{l.name}</strong><span class="small muted block">{l.about}</span></span>
          </div>
        {/each}
      </div>
      <p class="small muted">
        Ogni livello ha i suoi esercizi chiave. L’app ti propone il livello dopo quando hai l’argento nel 75% degli esercizi chiave (con almeno un argento in ogni famiglia), l’oro nel 40%, e queste misure vengono da almeno 4 sedute in almeno 14 giorni. Puoi dire di no: la proposta torna dopo 21 giorni, o prima se prendi 3 ori nuovi.
      </p>
    </div>
  </section>

  <section class="section">
    <h2 class="heading">Il modello Completo · 90 minuti</h2>
    <div class="bar" role="img" aria-label="Le cinque fasi">
      {#each PHASES as p (p.id)}<span style:flex={p.minutes} class:hot={p.id.startsWith('ex')}></span>{/each}
    </div>
    <div class="card flush list phases">
      <div class="item"><span class="mono min">10′</span><span class="grow"><strong>Riscaldamento</strong><span class="small muted block">Dritto e rovescio in diagonale, top su block. Dal mese 2 gli ultimi 5 minuti sono il mantenimento del mese prima.</span></span></div>
      <div class="item"><span class="mono min">14′</span><span class="grow"><strong>Servizi e ricezione</strong><span class="small muted block">Metà tempo serve uno, metà l’altro: a metà suona il cambio. Chi non serve allena la ricezione del mese.</span></span></div>
      <div class="item"><span class="mono min">24′</span><span class="grow"><strong>Esercizio 1</strong><span class="small muted block">Il primo percorso del mese: l’app propone il primo esercizio della sequenza che non ha ancora l’argento. A metà di ogni esercizio suona il cambio e il riquadro del tempo diventa scuro: tocca al compagno. Se comincia lui, tocca l’etichetta «Tocca a te» e i turni si invertono. Nel palleggio e negli esercizi da solo non c’è cambio.</span></span></div>
      <div class="item"><span class="mono min">24′</span><span class="grow"><strong>Esercizio 2</strong><span class="small muted block">Il secondo percorso del mese, come sopra.</span></span></div>
      <div class="item"><span class="mono min">14′</span><span class="grow"><strong>Partitella</strong><span class="small muted block">Metà tempo per tipo, a metà suona il cambio.</span><span class="small muted block"><strong>{MATCH_TYPES.risk.name}.</strong> {MATCH_TYPES.risk.text} {MATCH_TYPES.risk.why}</span><span class="small muted block"><strong>{MATCH_TYPES.scheme.name}.</strong> Si sceglie uno schema. {MATCH_TYPES.scheme.text}</span></span></div>
    </div>
    <p class="small muted note">Fra una fase e l’altra c’è {PAUSE_MINUTES} minuto di pausa, con il conto alla rovescia. Si può saltare. Il minuto si toglie alla fase dopo: il totale resta 90. Vale per tutti i modelli, anche i tuoi.</p>
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
            <p class="small muted">{block.tracks.map((t) => app.catalog.track(t).name).join(' · ')}</p>
            <p class="small">Schemi della partitella: {block.schemes.map((x) => SCHEMES[x].name.toLowerCase()).join(', ')}</p>
          </div>
        </div>
      {/each}
    </div>
    <p class="small muted note">Il programma di base dà quattro settimane a ogni tema, ma nel piano puoi scegliere tu: un allenamento solo, una, due o quattro settimane. Una settimana saltata? Nel piano metti una pausa e tutto slitta.</p>
  </section>

  <section class="section">
    <h2 class="heading">Fatto su misura</h2>
    <div class="card flush list">
      <div class="item"><span class="grow"><strong>Esercizi</strong><span class="small muted block">{LIBRARY.length} esercizi in otto famiglie, con livello suggerito, formato, criterio di qualità, errori comuni e medaglie. Si filtrano per livello e per formato.</span></span></div>
      <div class="item"><span class="grow"><strong>Modelli</strong><span class="small muted block">La scaletta di un allenamento: riscaldamento, servizi, esercizi del mese, esercizi fissi, esercizi liberi, partitella. Ne crei quanti vuoi, ognuno con il suo colore.</span></span></div>
      <div class="item"><span class="grow"><strong>Percorsi</strong><span class="small muted block">Una sequenza di esercizi, dal più guidato al più libero. Puoi usare quelli della libreria o scriverne di tuoi.</span></span></div>
      <div class="item"><span class="grow"><strong>Temi</strong><span class="small muted block">Un tema con fino a tre percorsi, il mantenimento, i servizi e lo schema della partitella. Nel piano li metti in fila, ognuno per un allenamento o per una, due o quattro settimane.</span></span></div>
    </div>
    <p class="small muted note">Tutto dalla Libreria. Si può anche importare un file preparato da un assistente.</p>
  </section>

  <section class="section">
    <h2 class="heading">I tuoi dati</h2>
    <div class="card stack g-12">
      {#if app.cloud}
        <p>Diario, note, medaglie e livello li vedi solo tu. Il gruppo vede solo il tuo nome, se lo consenti.</p>
        <p class="muted">Funziona anche senza rete: registra in palestra e sincronizza quando torna il segnale. Dal menu del browser puoi aggiungerla alla schermata Home.</p>
      {:else}
        <p>Modalità locale: i dati restano in questo browser. Da Impostazioni puoi esportarli.</p>
      {/if}
    </div>
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
  .rules {
    margin: 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .lvl.me {
    background: color-mix(in srgb, var(--accent) 10%, var(--card));
  }
</style>
