<script>
  // Impostazioni: righe con un'icona a sinistra, raggruppate. Il profilo in alto; poi allenamento
  // (piano e livello), preferenze, gruppo, dati, informazioni. Sottotitoli solo dove servono.
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import X from '@lucide/svelte/icons/x';
  import CalendarRange from '@lucide/svelte/icons/calendar-range';
  import SunMoon from '@lucide/svelte/icons/sun-moon';
  import Volume2 from '@lucide/svelte/icons/volume-2';
  import Vibrate from '@lucide/svelte/icons/vibrate';
  import Repeat from '@lucide/svelte/icons/repeat';
  import CalendarDays from '@lucide/svelte/icons/calendar-days';
  import Hand from '@lucide/svelte/icons/hand';
  import Users from '@lucide/svelte/icons/users';
  import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
  import FileJson from '@lucide/svelte/icons/file-json';
  import Upload from '@lucide/svelte/icons/upload';
  import Trash from '@lucide/svelte/icons/trash-2';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import LogOut from '@lucide/svelte/icons/log-out';
  import Signal from '@lucide/svelte/icons/signal';
  import LevelBadge from '../ui/LevelBadge.svelte';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { backup, diaryCsv, parseBackup } from '../engine/export.js';
  import { VERSION } from '../data/changelog.js';
  import { PLAYER_LEVEL } from '../data/library.js';
  import { WEEKDAYS_SHORT, fmtLong } from '../util/dates.js';
  import PageHead from '../ui/PageHead.svelte';
  import Avatar from '../ui/Avatar.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import Toggle from '../ui/Toggle.svelte';

  const s = $derived(app.settings);
  const rhythm = $derived.by(() => {
    const slots = app.plan?.slots ?? [];
    const days = [...new Set(slots.filter((x) => x.kind === 'training').map((x) => WEEKDAYS_SHORT[x.day - 1]))];
    const tests = slots.filter((x) => x.kind === 'test').length;
    if (!slots.length) return 'Nessun appuntamento fisso';
    return `${days.join(', ')}${tests ? ` · ${tests} test` : ''}`;
  });
  let newEmail = $state('');


  function addMember() {
    const email = newEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return ui.toast('Email non valida', { tone: 'error' });
    const emails = app.access?.emails ?? [];
    if (!emails.includes(email)) app.setMembers([...emails, email]);
    newEmail = '';
  }
  function removeMember(email) {
    app.setMembers((app.access?.emails ?? []).filter((e) => e !== email));
  }

  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportJson() {
    // Le voci come sono salvate, comprese quelle in programma: la copia deve poter tornare uguale.
    download(`terza-palla-${app.today}.json`, JSON.stringify(backup({ meta: app.meta, events: app.rawEvents, notes: app.notes }), null, 2), 'application/json');
  }

  let fileInput = $state();
  const count = (n, one, many) => (n === 1 ? one : `${n} ${many}`);
  /** Legge la copia scelta, dice cosa contiene e, dopo la conferma, la mette al posto dei dati di adesso. */
  async function pickedBackup(e) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    let data;
    try {
      data = parseBackup(await file.text());
    } catch (err) {
      return ui.toast(err.message, { tone: 'error', ms: 6000 });
    }
    const when = data.exportedAt ? ` del ${fmtLong(data.exportedAt.slice(0, 10))}` : '';
    ui.open('confirm', {
      title: 'Ripristinare questa copia?',
      text: `La copia${when} contiene ${count(data.events.length, 'una voce', 'voci')} e ${count(data.notes.length, 'una nota', 'note')}. Prende il posto di tutti i dati di adesso: non si può annullare.`,
      action: 'Ripristina',
      danger: true,
      onconfirm: async () => {
        try {
          await app.restore(data);
          ui.toast('Copia ripristinata');
        } catch (err) {
          console.error(err);
          ui.toast('Non sono riuscito a ripristinare la copia. Riprova.', { tone: 'error' });
        }
      }
    });
  }

  function exportCsv() {
    const names = { strokeName: (id) => app.strokeName(id), errorName: (id) => app.errorName(id) };
    download(`terza-palla-${app.today}.csv`, diaryCsv({ events: app.events, notes: app.notes, catalog: app.catalog, names }), 'text/csv');
  }

  function wipe() {
    ui.open('confirm', {
      title: 'Cancellare tutti i tuoi dati?',
      text: 'Piano, allenamenti, misure e note. Non si può annullare: scarica prima una copia completa, che poi puoi ripristinare.',
      action: 'Cancella tutto',
      danger: true,
      onconfirm: () => app.wipe()
    });
  }
</script>

{#snippet row(Icon, label, sub, onclick, extra = null, danger = false)}
  <button class="row-btn" class:danger {onclick}>
    <span class="ico"><Icon size={20} /></span>
    <span class="grow"><span class="lbl">{label}</span>{#if sub}<span class="sub">{sub}</span>{/if}</span>
    {#if extra}{@render extra()}{/if}
    {#if !danger}<ChevronRight size={18} />{/if}
  </button>
{/snippet}

<div class="page enter settings">
  <PageHead title="Impostazioni" back />

  <section class="card me">
    <Avatar name={app.name} photo={app.photo} size={52} />
    <div class="grow">
      <input class="name" value={app.name} placeholder="Il tuo nome" onchange={(e) => app.patchMeta({ profile: { name: e.currentTarget.value.trim() } })} aria-label="Nome" />
      <p class="small muted">{app.user?.email || 'Modalità locale: i dati restano su questo dispositivo'}</p>
    </div>
  </section>

  <section class="section">
    <h2 class="heading">Allenamento</h2>
    <div class="card flush list">
      {@render row(CalendarRange, app.plan ? 'Il piano' : 'Crea il piano', app.plan ? `${rhythm} · dal ${fmtLong(app.plan.start)}` : '', () => ui.open('plan'))}
      {#snippet lv()}<LevelBadge level={app.player.level} small />{/snippet}
      <button class="row-btn" onclick={() => ui.open('level')}>
        <span class="ico"><Signal size={20} /></span>
        <span class="grow"><span class="lbl">Il tuo livello</span></span>
        {@render lv()}
        <ChevronRight size={18} />
      </button>
    </div>
  </section>

  <section class="section">
    <h2 class="heading">Preferenze</h2>
    <div class="card prefs">
      <div class="theme-row">
        <span class="ico"><SunMoon size={20} /></span>
        <span class="grow lbl">Aspetto</span>
        <Segmented
          small
          options={[
            { id: 'auto', label: 'Auto' },
            { id: 'light', label: 'Chiaro' },
            { id: 'dark', label: 'Scuro' }
          ]}
          value={s.theme}
          onchange={(theme) => app.patchSettings({ theme })}
        />
      </div>
      <Toggle icon={Volume2} label="Suoni" checked={s.sound} onchange={(sound) => app.patchSettings({ sound })} />
      <Toggle icon={Vibrate} label="Vibrazione" checked={s.haptics} onchange={(haptics) => app.patchSettings({ haptics })} />
      <Toggle icon={Repeat} label="Cambio a metà esercizio" hint="Un bip, e il riquadro del tempo cambia colore quando tocca al compagno" checked={s.turns} onchange={(turns) => app.patchSettings({ turns })} />
      <Toggle icon={CalendarDays} label="Il piano nel Diario" hint="Fra le settimane del calendario, su cosa lavori quando cambia" checked={Boolean(s.calThemes)} onchange={(calThemes) => app.patchSettings({ calThemes })} />
      <Toggle icon={Hand} label="Sono mancino" hint="Scambia i lati nel disegno del tavolo" checked={Boolean(s.lefty)} onchange={(lefty) => app.patchSettings({ lefty })} />
    </div>
  </section>

  {#if app.cloud}
    <section class="section">
      <h2 class="heading">Gruppo</h2>
      <div class="card prefs">
        <Toggle
          icon={Users}
          label="Mostrami nel gruppo"
          hint="Solo il nome. Medaglie, livello, diario e note restano tuoi."
          checked={s.share}
          onchange={(share) => {
            app.patchSettings({ share });
            app.refreshProfile();
          }}
        />
      </div>

      <div class="card flush list after">
        {#each app.mates as m (m.id)}
          <div class="item">
            <Avatar name={m.name} photo={m.photo} size={32} />
            <strong class="grow">{m.name}</strong>
          </div>
        {:else}
          <p class="empty small muted">Quando un compagno entra nel gruppo, lo vedi qui.</p>
        {/each}
      </div>

      {#if app.isAdmin}
        {#if app.requests.length}
          <div class="card flush list after">
            {#each app.requests as r (r.id)}
              <div class="item">
                <Avatar name={r.name} photo={r.photo} size={32} />
                <span class="grow"><strong>{r.name || r.email}</strong><span class="small muted block">{r.email} · chiede di entrare</span></span>
                <button class="btn plain small" onclick={() => app.reject(r)}>No</button>
                <button class="btn primary small" onclick={() => app.approve(r)}>Approva</button>
              </div>
            {/each}
          </div>
        {/if}
        <div class="card stack g-12 after">
          <span class="heading">Chi può entrare</span>
          {#each app.access?.admins ?? [] as email (email)}
            <div class="spread"><span>{email}</span><span class="tag">amministratore</span></div>
          {/each}
          {#each app.access?.emails ?? [] as email (email)}
            <div class="spread">
              <span>{email}</span>
              <button class="icon-btn" onclick={() => removeMember(email)} aria-label="Togli {email}"><X size={16} /></button>
            </div>
          {/each}
          <form class="row g-8" onsubmit={(e) => { e.preventDefault(); addMember(); }}>
            <input class="field grow" type="email" placeholder="email@gmail.com" bind:value={newEmail} />
            <button class="btn primary small" type="submit">Invita</button>
          </form>
        </div>
      {/if}
    </section>
  {/if}

  <section class="section">
    <h2 class="heading">Dati</h2>
    <div class="card flush list">
      {@render row(FileSpreadsheet, 'Esporta il diario', 'Un file CSV, per Excel o Fogli', exportCsv)}
      {@render row(FileJson, 'Copia completa', 'Un file JSON con piano, allenamenti e note', exportJson)}
      {@render row(Upload, 'Ripristina una copia', 'Rimette i dati di una copia completa', () => fileInput.click())}
      {@render row(Trash, 'Cancella tutti i miei dati', '', wipe, null, true)}
    </div>
  </section>

  <input class="sr-only" type="file" accept="application/json,.json" bind:this={fileInput} onchange={pickedBackup} tabindex="-1" aria-hidden="true" />

  <section class="section">
    <h2 class="heading">Informazioni</h2>
    <div class="card flush list">
      {#snippet ver()}<span class="ver t-num">v{VERSION}</span>{/snippet}
      {@render row(Sparkles, 'Novità', '', () => (ui.news = { history: true }), ver)}
      {@render row(BookOpen, 'Guida', '', () => ui.go('guida'))}
      {#if app.cloud}{@render row(LogOut, 'Esci', '', () => app.signOut(), null, true)}{/if}
    </div>
    <p class="small faint after">Terza palla {VERSION}{app.cloud ? '' : ' · modalità locale'}</p>
  </section>
</div>

<style>
  .me {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 20px;
  }
  .name {
    width: 100%;
    border: 0;
    background: none;
    outline: none;
    font-size: 18px;
    font-weight: 700;
    padding: 0;
  }
  strong {
    font-weight: 650;
  }
  .block {
    display: block;
  }
  .row-btn {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 60px;
    padding: 10px 16px;
    text-align: left;
    color: var(--ink);
  }
  .row-btn + .row-btn {
    border-top: 1px solid var(--line);
  }
  .row-btn > :global(svg) {
    color: var(--ink-3);
    flex: none;
  }
  .ico {
    display: grid;
    place-items: center;
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 11px;
    background: var(--sunk);
    color: var(--ink-2);
  }
  .lbl {
    display: block;
    font-weight: 600;
  }
  .sub {
    display: block;
    font-size: 13px;
    color: var(--ink-3);
  }
  .row-btn.danger,
  .row-btn.danger .ico {
    color: var(--down);
  }
  .ver {
    font-size: 13px;
    color: var(--ink-3);
  }
  .prefs {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 16px;
  }
  .prefs :global(.toggle .grow) {
    font-weight: 600;
  }
  .prefs :global(.toggle .muted) {
    font-weight: 400;
  }
  .theme-row {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .after {
    margin-top: 10px;
  }
  .empty {
    padding: 14px 16px;
  }
</style>
