/*
 * JS version of https://curl.se/libcurl/c/simple.html
 */

import { CFunction } from 'quickjs-ffi.js'

const LIBCURL_SO = '/usr/lib/x86_64-linux-gnu/libcurl.so.4'
const curl_easy_init = new CFunction(LIBCURL_SO, 'curl_easy_init', null, 'pointer').invoke;
const CURLOPT_URL = 10000 + 2;
const CURLOPT_FOLLOWLOCATION = 0 + 52;
const curl_easy_perform = new CFunction(LIBCURL_SO, 'curl_easy_perform', null, 'int', 'pointer').invoke;
const CURLE_OK = 0;
const curl_easy_strerror = new CFunction(LIBCURL_SO, 'curl_easy_strerror', null, 'string', 'int').invoke;
const curl_easy_cleanup = new CFunction(LIBCURL_SO, 'curl_easy_cleanup', null, 'void', 'pointer').invoke;

let curl = curl_easy_init();
if (curl > 0) {
    let curl_easy_setopt = new CFunction(LIBCURL_SO, 'curl_easy_setopt', 2, 'int', 'pointer', 'int', 'string');
    curl_easy_setopt.invoke(curl, CURLOPT_URL, "https://example.com");
    curl_easy_setopt.free();
    curl_easy_setopt = new CFunction(LIBCURL_SO, 'curl_easy_setopt', 2, 'int', 'pointer', 'int', 'long');
    curl_easy_setopt.invoke(curl, CURLOPT_FOLLOWLOCATION, 1);
    curl_easy_setopt.free();
    let res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        console.log("curl_easy_perform() failed:", curl_easy_strerror(res));
    }
    curl_easy_cleanup(curl);
}
