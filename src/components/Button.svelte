<script>
	import { goto } from '@sapper/app';
	import Icon from './Icon.svelte';
	export let submit = undefined;
	export let icon = undefined;
	export let disabled = false;
	export let full = false;
	export let type = 'normal';
	export let small = false;
	export let clear = false;
	export let href = undefined;
	export let hrefReplace = false;
	let submitWrapper = async () => {
		if (!disabled) {
			if (submit) {
				await submit();
			} else if (href) {
				if (typeof window != 'undefined' && href[0] == '#') {
					window.location.hash = href;
				} else {
					await goto(href, hrefReplace);
				}
			}
		}
	};
	let content;
</script>

<button on:click|preventDefault={submitWrapper} class:clear={clear || (icon && !content?.textContent)} class:disabled class:full class:error={type == 'error'} class:small>
	{#if icon}
		<Icon><svelte:component this={icon} /></Icon>
	{/if}
	<span bind:this={content}>
		{#if href}
			<a {href}><slot /></a>
		{:else}
			<slot />
		{/if}
	</span>
</button>

<style>
	button {
		vertical-align: middle;
		line-height: 1;
		padding: 0.5em;
	}
	.disabled {
		cursor: default;
		background-color: #0004;
		color: #aaa;
	}
	.clear {
		background: none;
	}
	.full {
		width: 100%;
	}
	.small {
		width: unset;
		padding: 0.25em;
		margin: 0;
	}
</style>
