<script>
  // Guida: il metodo in una pagina. In vista i cinque passi; il resto (medaglie, livello, durante
  // l'allenamento, il piano, la libreria, i dati) in sezioni chiuse, una per argomento. Qui stanno
  // le spiegazioni lunghe tolte dalle altre pagine.
  import { app } from '../store/app.svelte.js';
  import { MATCH_TYPES, SCHEMES, PAUSE_MINUTES } from '../data/program.js';
  import { LIBRARY, PLAYER_LEVELS, TIERS, TIER } from '../data/library.js';
  import PageHead from '../ui/PageHead.svelte';
  import MedalBadge from '../ui/MedalBadge.svelte';
  import LevelBadge from '../ui/LevelBadge.svelte';
  import Collapse from '../ui/Collapse.svelte';

  const STEPS = [
    ['Il tuo livello', 'Scegli il livello che ti somiglia di più. Serve solo a proporti esercizi adatti: puoi fare qualsiasi esercizio, a qualsiasi livello.'],
    ['Costruire un allenamento', 'Tocca il tasto + in basso. Ogni fondamentale è una cosa da allenare: aggiungi quelli che vuoi, decidi quanto durano e scegli gli esercizi.'],
    ['Allenarsi', 'Apri Oggi e tocca Inizia: trovi l’allenamento del giorno con il timer. Puoi allenarti anche nei giorni che non hai messo in programma.'],
    ['Provare un obiettivo', 'Su ogni esercizio puoi toccare «Prova l’obiettivo»: l’app ti mostra la prossima medaglia, per esempio «Argento: 10 di fila».'],
    ['Alla fine', 'Di’ com’è andata e, se vuoi, scrivi una nota per ogni colpo. Le note le rileggi in Progressi, nella mappa del colpo.']
  ];
  const example = LIBRARY.find((e) => e.id === 'top-d-block');
</script>

<div class="page enter guide">
  <PageHead title="Guida" back />
  <p class="intro">Gli allenamenti li costruisci tu con i fondamentali: dritto, rovescio, servizio e gli altri. Ogni esercizio ha le sue medaglie. Niente è bloccato.</p>

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
      <p>Un allenamento è una fila di fondamentali. Ogni fondamentale ha la sua durata; se ha più esercizi, il tempo si divide in parti uguali. La partita si gioca metà {MATCH_TYPES.risk.name.toLowerCase()} e metà {MATCH_TYPES.scheme.name.toLowerCase()}.</p>
      <ul class="rules">
        <li><b>Il cambio.</b> A metà di ogni esercizio in due suona un doppio bip e il riquadro del tempo diventa scuro: tocca al compagno. Se comincia lui, tocca l’etichetta «Tocca a te» e i turni si invertono. Nel palleggio e negli esercizi da solo non c’è cambio.</li>
        <li><b>Le pause.</b> Gli allenamenti costruiti con i fondamentali non hanno pause: la durata è la somma dei fondamentali. Nei modelli di base fra una fase e l’altra c’è {PAUSE_MINUTES} minuto di pausa, che puoi saltare.</li>
      </ul>
    </Collapse>

    <Collapse title="Il programma" open={false} key="guida-programma">
      <ul class="rules">
        <li>Al primo avvio scegli per quanto tempo fare il tuo allenamento: solo oggi, una settimana o un mese, e in quali giorni.</li>
        <li>In Oggi trovi sempre un allenamento pronto. Per cambiarlo, apri la Libreria, tocca uno dei tuoi allenamenti e poi «Mettilo in calendario».</li>
        <li>Lezioni, partite e tornei si aggiungono dal Diario: tocca un giorno e poi «Aggiungi a questo giorno».</li>
      </ul>
    </Collapse>

    <Collapse title="La mappa" open={false} key="guida-mappa">
      <ul class="rules">
        <li>In Progressi, alla voce Mappa, ogni colpo ha la sua mappa: una casella per esercizio, con la medaglia più alta che hai vinto.</li>
        <li>Più scendi, più il livello sale. La pallina indica l’esercizio su cui lavorare adesso: il primo senza argento.</li>
        <li>Tocca una casella per vedere quanto serve per ogni medaglia e per misurarti subito.</li>
      </ul>
    </Collapse>

    <Collapse title="La libreria" open={false} key="guida-libreria">
      <ul class="rules">
        <li><b>Esercizi.</b> {LIBRARY.length} esercizi in otto famiglie, con il livello suggerito, il formato, come deve venire, gli errori comuni e le medaglie.</li>
        <li><b>I tuoi allenamenti.</b> Quelli che hai costruito. Toccane uno per cambiargli nome, metterlo in calendario, cambiare i fondamentali o eliminarlo.</li>
        <li><b>I fondamentali.</b> Uno per colpo: Dritto, Rovescio, Servizio, Ricezione, Gambe, Gioco tagliato e Schemi. Ognuno apre la sua mappa.</li>
        <li><b>Modelli di base, pacchetti, mesi e percorsi.</b> Gli allenamenti già pronti delle versioni di prima: restano in fondo, chiusi.</li>
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
    box-shadow: var(--shadow-card);
  }
  .n {
    display: grid;
    place-items: center;
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: 11px;
    background: var(--accent);
    color: var(--accent-on);
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
    box-shadow: var(--shadow-card);
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
</style>
