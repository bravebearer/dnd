function switchThemes() {
    let currentTheme = document.documentElement.style.colorScheme;

    if (!currentTheme) {
        currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    if (currentTheme === "dark") {
        document.documentElement.style.colorScheme = 'light';
    } else {
        document.documentElement.style.colorScheme = 'dark';
    }
}

document.getElementById("themeBtn").onclick = switchThemes;