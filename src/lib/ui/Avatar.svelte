<script>
  let { name = '', photo = '', size = 36 } = $props();

  let broken = $state(false);
  const initials = $derived(
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')
  );
</script>

<span class="avatar" style:width="{size}px" style:height="{size}px" style:font-size="{Math.round(size * 0.38)}px">
  {#if photo && !broken}
    <img src={photo} alt="" referrerpolicy="no-referrer" onerror={() => (broken = true)} />
  {:else}
    {initials || '·'}
  {/if}
</span>

<style>
  .avatar {
    display: inline-grid;
    place-items: center;
    flex: none;
    border-radius: 50%;
    background: var(--sunk);
    color: var(--ink-2);
    font-weight: 600;
    overflow: hidden;
    box-shadow: inset 0 0 0 1px var(--line);
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
