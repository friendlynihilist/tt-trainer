<script>
  // Impostazioni: piano, livello, preferenze, gruppo, dati.
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import X from '@lucide/svelte/icons/x';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { backup, diaryCsv } from '../engine/export.js';
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
    download(`terza-palla-${app.today}.json`, JSON.stringify(backup({ meta: app.meta, events: app.events, notes: app.notes }), null, 2), 'application/json');
  }

  function exportCsv() {
    const names = { strokeName: (id) => app.strokeName(id), errorName: (id) => app.errorName(id) };
    download(`terza-palla-${app.today}.csv`, diaryCsv({ events: app.events, notes: app.notes, catalog: app.catalog, names }), 'text/csv');
  }

  function wipe() {
    ui.open('confirm', {
      title: 'Cancellare tutti i tuoi dati?',
      text: 'Piano, sessioni, misure e note. Non si può annullare: esporta prima una copia.',
      action: 'Cancella tutto',
      danger: true,
      onconfirm: () => app.wipe()
    });
  }
</script>

<div class="page enter">
  <PageHead eyebrow="Impostazioni" title={app.firstName || 'Profilo'} actions={false} />

  <section class="card me">
    <Avatar name={app.name} photo={app.photo} size={48} />
    <div class="grow">
      <input class="name" value={app.name} placeholder="Il tuo nome" onchange={(e) => app.patchMeta({ profile: { name: e.currentTarget.value.trim() } })} aria-label="Nome" />
      <p class="small muted">{app.user?.email || 'Modalità locale · dati su questo dispositivo'}</p>
    </div>
  </section>

  <section class="section">
    <h2 class="heading">Piano</h2>
    <div class="card flush list">
      <button class="item" onclick={() => ui.open('plan')}>
        <span class="grow">
          {#if app.plan}
            <strong>{rhythm}</strong>
            <span class="small muted block">Iniziato {fmtLong(app.plan.start)} · ritmo, mesi, pause, nuovo ciclo</span>
          {:else}
            <strong>Crea il piano</strong>
          {/if}
        </span>
        <ChevronRight size={16} />
      </button>
    </div>
  </section>

  <section class="section">
    <h2 class="heading">Il tuo livello</h2>
    <div class="card flush list">
      <button class="item" onclick={() => ui.open('level')}>
        <span class="grow">
          <strong>{PLAYER_LEVEL[app.player.level].name}</strong>
          <span class="small muted block">Serve solo a proporti esercizi: puoi fare tutto, a qualsiasi livello.</span>
        </span>
        <ChevronRight size={16} />
      </button>
    </div>
  </section>

  <section class="section">
    <h2 class="heading">Preferenze</h2>
    <div class="card stack g-16">
      <div class="spread">
        <span>Tema</span>
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
      <Toggle label="Suoni" hint="Fine fase e cambio al servizio" checked={s.sound} onchange={(sound) => app.patchSettings({ sound })} />
      <Toggle label="Vibrazione" checked={s.haptics} onchange={(haptics) => app.patchSettings({ haptics })} />
      <Toggle label="Cambio ogni 5 minuti" hint="Negli esercizi, per alternarvi" checked={s.turns} onchange={(turns) => app.patchSettings({ turns })} />
      <Toggle label="Sono mancino" hint="Scambia i lati nel disegno del tavolo" checked={Boolean(s.lefty)} onchange={(lefty) => app.patchSettings({ lefty })} />
    </div>
  </section>

  {#if app.cloud}
    <section class="section">
      <h2 class="heading">Gruppo</h2>
      <div class="card stack g-16">
        <Toggle
          label="Mostrami nel gruppo"
          hint="Solo il nome. Medaglie, livello, diario e note restano tuoi."
          checked={s.share}
          onchange={(share) => {
            app.patchSettings({ share });
            app.refreshProfile();
          }}
        />
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
          <span class="small muted">Chi può entrare</span>
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
            <button class="btn primary" type="submit">Invita</button>
          </form>
        </div>
      {/if}
    </section>
  {/if}

  <section class="section">
    <h2 class="heading">Dati</h2>
    <div class="card flush list">
      <button class="item" onclick={exportCsv}><span class="grow">Esporta il diario<span class="small muted block">CSV, si apre con Excel o Fogli</span></span><ChevronRight size={16} /></button>
      <button class="item" onclick={exportJson}><span class="grow">Copia completa<span class="small muted block">JSON con piano, sessioni e note</span></span><ChevronRight size={16} /></button>
      <button class="item danger" onclick={wipe}><span class="grow">Cancella tutti i miei dati</span></button>
    </div>
  </section>

  <section class="section">
    <h2 class="heading">Informazioni</h2>
    <div class="card flush list">
      <button class="item" onclick={() => (ui.news = { history: true })}>
        <span class="grow">Novità<span class="small muted block">Cosa è cambiato, versione per versione</span></span>
        <span class="mono small muted">v{VERSION}</span>
        <ChevronRight size={16} />
      </button>
    </div>
    <p class="small faint after">Terza palla {VERSION}{app.cloud ? '' : ' · modalità locale'}</p>
  </section>

  <section class="section links">
    <a class="btn ghost" href="#/guida">Guida</a>
    <button class="btn plain" onclick={() => app.signOut()}>Esci</button>
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
    font-size: 17px;
    font-weight: 580;
    padding: 0;
  }
  strong {
    font-weight: 560;
  }
  .block {
    display: block;
  }
  .item :global(svg) {
    color: var(--ink-3);
  }
  .item.danger {
    color: var(--down);
  }
  .after {
    margin-top: 10px;
  }
  .links {
    display: flex;
    gap: 10px;
  }
  .links a {
    text-decoration: none;
  }
</style>
