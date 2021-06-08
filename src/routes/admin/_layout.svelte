<script context="module">
	export async function preload(page, session) {
		if (!session.user) return this.redirect(302, '/login');
	}
</script>

<slot />
