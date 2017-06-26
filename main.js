'use strict';

const api = require('./src/api');

setInterval(async function () {
    console.log(await api.allcoins());
}, 1000);

