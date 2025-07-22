// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4 as Client4Class, ClientError} from '@mattermost/client';

import manifest from './manifest';
import {getSiteURLFromWindowObject} from './utils';

const Client4 = new Client4Class();

let siteURL = getSiteURLFromWindowObject();
let basePath = new URL(siteURL).pathname;

function baseRoute(): string {
    return `${basePath}/plugins/${manifest.id}`;
}

export function setSiteUrl(url: string) {
    siteURL = url;
    basePath = new URL(url).pathname;
}

function channelRoute(channelid: string): string {
    return `${baseRoute()}/channel/${channelid}`;
}

function postRoute(postId: string): string {
    return `${baseRoute()}/post/${postId}`;
}

async function doGet(url: string): Promise<any> {
    const response = await fetch(siteURL + url, Client4.getOptions({
        method: 'GET',
    }));

    if (response.ok) {
        return response.json();
    }

    throw new ClientError(Client4.url, {
        message: '',
        status_code: response.status,
        url,
    });
}

async function doPost(url: string, data: any): Promise<any> {
    const response = await fetch(siteURL + url, Client4.getOptions({
        method: 'POST',
        body: JSON.stringify(data),
    }));

    if (response.ok) {
        return response.json();
    }

    throw new ClientError(Client4.url, {
        message: '',
        status_code: response.status,
        url,
    });
}

export async function getChannelTranslationStatus(channelId: string) {
    const url = `${channelRoute(channelId)}/translations`;
    return doGet(url);
}

export async function toggleChannelTranslations(channelId: string, enabled: boolean) {
    const url = `${channelRoute(channelId)}/translations`;
    return doPost(url, {enabled});
}

export async function translatePost(postId: string, lang: string) {
    const url = `${postRoute(postId)}/translate`;
    return doPost(url, {lang});
}

export async function getTranslationLanguages() {
    const url = `${baseRoute()}/translation/languages`;
    return doGet(url);
}

export async function setUserTranslationLanguage(language: string) {
    const url = `${baseRoute()}/translation/user_preference`;
    return doPost(url, {language});
}
