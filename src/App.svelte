<script>
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from './lib/store/app.svelte.js';
  import { ui } from './lib/store/ui.svelte.js';

  import Nav from './lib/ui/Nav.svelte';
  import Toasts from './lib/ui/Toasts.svelte';
  import Splash from './lib/screens/Splash.svelte';
  import Login from './lib/screens/Login.svelte';
  import NoAccess from './lib/screens/NoAccess.svelte';
  import Wizard from './lib/screens/Wizard.svelte';
  import Live from './lib/screens/Live.svelte';
  import WhatsNew from './lib/ui/WhatsNew.svelte';
  import { VERSION, unseen } from './lib/data/changelog.js';

  import Today from './lib/pages/Today.svelte';
  import Calendar from './lib/pages/Calendar.svelte';
  import Progress from './lib/pages/Progress.svelte';
  import Library from './lib/pages/Library.svelte';
  import Guide from './lib/pages/Guide.svelte';
  import Settings from './lib/pages/Settings.svelte';

  import AddSheet from './lib/sheets/AddSheet.svelte';
  import EventSheet from './lib/sheets/EventSheet.svelte';
  import PickSheet from './lib/sheets/PickSheet.svelte';
  import ConfirmSheet from './lib/sheets/ConfirmSheet.svelte';
  import TrackSheet from './lib/sheets/TrackSheet.svelte';
  import StrokeSheet from './lib/sheets/StrokeSheet.svelte';
  import ObsSheet from './lib/sheets/ObsSheet.svelte';
  import PlanSheet from './lib/sheets/PlanSheet.svelte';
  import DateSheet from './lib/sheets/DateSheet.svelte';
  import TemplateSheet from './lib/sheets/TemplateSheet.svelte';
  import BlockSheet from './lib/sheets/BlockSheet.svelte';
  import TrackEditSheet from './lib/sheets/TrackEditSheet.svelte';
  import ImportSheet from './lib/sheets/ImportSheet.svelte';
  import ExerciseSheet from './lib/sheets/ExerciseSheet.svelte';
  import LevelSheet from './lib/sheets/LevelSheet.svelte';
  import NoteSheet from './lib/sheets/NoteSheet.svelte';
  import StageSheet from './lib/sheets/StageSheet.svelte';

  const PAGES = { oggi: Today, calendario: Calendar, progressi: Progress, libreria: Library, guida: Guide, impostazioni: Settings };
  const SHEETS = {
    add: AddSheet,
    event: EventSheet,
    pick: PickSheet,
    confirm: ConfirmSheet,
    track: TrackSheet,
    stroke: StrokeSheet,
    obs: ObsSheet,
    plan: PlanSheet,
    date: DateSheet,
    template: TemplateSheet,
    block: BlockSheet,
    trackedit: TrackEditSheet,
    import: ImportSheet,
    exercise: ExerciseSheet,
    level: LevelSheet,
    note: NoteSheet,
    stage: StageSheet
  };

  onMount(() => {
    app.start();
    const onKey = (e) => {
      if (e.key === 'Escape' && ui.sheets.length) ui.close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  $effect(() => {
    document.body.classList.toggle('no-scroll', ui.sheets.length > 0 || ui.live != null);
  });

  $effect(() => {
    if (app.error) {
      ui.toast(app.error, { tone: 'error' });
      app.clearError();
    }
  });

  // Il tema scelto vale anche prima dell'accesso: lo ricordiamo sul dispositivo.
  $effect(() => {
    if (app.stage !== 'ready') return;
    const theme = app.settings.theme;
    const root = document.documentElement;
    if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
    else delete root.dataset.theme;
    try {
      localStorage.setItem('tt-trainer:theme', theme);
    } catch {}
  });

  const Page = $derived(PAGES[ui.route.name] ?? Today);
  const inApp = $derived(app.stage === 'ready' && app.onboarded);

  // Le novità compaiono una volta sola per account dopo un aggiornamento (chi arriva ora non le vede:
  // il primo avvio segna già la versione). Chi era sulla 0.1.0 non aveva nulla di salvato.
  let dismissed = $state(false);
  const fresh = $derived(inApp && app.meta ? unseen(app.meta.seenVersion ?? '0.1.0') : []);
  const autoNews = $derived(!dismissed && fresh.length > 0 && !ui.live && !ui.sheets.length);

  // Chi usava già l'app sceglie il suo livello una volta, dopo le novità. Chi arriva ora lo sceglie
  // nel primo avvio. Se chiude senza scegliere è principiante (vedi LevelSheet).
  let levelAsked = $state(false);
  $effect(() => {
    if (!inApp || !app.meta || app.meta.player?.level || levelAsked) return;
    if (autoNews || ui.news || ui.live || ui.sheets.length) return;
    levelAsked = true;
    ui.open('level', { auto: true });
  });

  function closeNews() {
    if (ui.news) ui.news = null;
    else {
      dismissed = true;
      app.patchMeta({ seenVersion: VERSION });
    }
  }
</script>

{#if app.stage === 'boot' || app.stage === 'loading'}
  <Splash />
{:else if app.stage === 'signin'}
  <Login />
{:else if app.stage === 'noaccess'}
  <NoAccess />
{:else if !app.onboarded}
  <Wizard />
{:else}
  <Nav />
  <main>
    {#key ui.route.name}
      <div in:fly={{ y: 10, duration: 360, easing: cubicOut }}>
        <Page />
      </div>
    {/key}
  </main>
{/if}

{#if inApp && ui.live}
  <Live />
{/if}

{#if inApp && (ui.news || autoNews)}
  <WhatsNew entries={fresh} history={Boolean(ui.news?.history)} onclose={closeNews} />
{/if}

{#each ui.sheets as s (s.id)}
  {@const Sheet = SHEETS[s.type]}
  <Sheet {...s.props} />
{/each}

{#if !app.online && app.cloud && inApp}
  <div class="offline" transition:fade={{ duration: 200 }}>Offline · sincronizza al ritorno della rete</div>
{/if}

<Toasts />

<style>
  main {
    margin-left: var(--rail);
  }
  .offline {
    position: fixed;
    z-index: 30;
    top: calc(env(safe-area-inset-top) + 8px);
    left: calc(var(--rail) + 50%);
    transform: translateX(calc(-50% - var(--rail) / 2));
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--ink);
    color: var(--paper);
    font-size: 12px;
    font-weight: 520;
    white-space: nowrap;
  }
</style>
