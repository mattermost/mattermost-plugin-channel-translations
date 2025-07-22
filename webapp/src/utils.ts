export function getSiteURLFromWindowObject(): string {
    let siteURL = '';
    if (window.location.origin) {
        siteURL = window.location.origin;
    } else {
        siteURL = window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
    }

    const obj = window as any;
    if (obj.basename) {
        siteURL += obj.basename;
    }

    if (siteURL[siteURL.length - 1] === '/') {
        siteURL = siteURL.substring(0, siteURL.length - 1);
    }

    return siteURL;
}