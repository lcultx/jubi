'use strict';

const urllib = require('urllib');
const util   = require('util');
const table  = require('cli-table');
const colors = require('colors/safe');
const config = require('../config.json');
const fs     = require('fs');

const finance_file = __dirname + '/../finance.json';
const cookie_file  = __dirname + '/../.cookie';

class Api {
    static async login() {
        const api  = 'https://www.jubi.com/ajax/user/login';
        let result = await urllib.request(api, {
            method  : 'POST',
            dataType: 'json',
            data    : {email: config.email, pw: config.password, ga: '谷歌双重认证码'}
        });

        return fs.writeFileSync(__dirname + '/../.cookie', result.res.headers['set-cookie']);
    }

    static async finance() {
        if (fs.existsSync(finance_file))
            return JSON.parse(fs.readFileSync(finance_file, 'utf-8'));

        const api = 'https://www.jubi.com/ajax/user/finance';

        if (!fs.existsSync(cookie_file))
            await this.login();

        let cookie = fs.readFileSync(cookie_file, 'utf-8');

        let response = await urllib.request(api, {
            method  : 'GET',
            dataType: 'json',
            headers : {'Cookie': cookie, 'User-Agent': config.ua}
        });

        let data   = response.data.data;
        let result = [];


        for (let name in data) {
            let matched = name.match(/^(.*?)_balance$/);
            if (matched) {
                let balance = data[name];

                if (parseInt(balance) === 0)
                    continue;

                result.push({
                    name   : matched[1],
                    balance: balance,
                    cost   : 0
                });
            }
        }

        fs.writeFileSync(finance_file, JSON.stringify(result));

        return result;
    }

    static async allcoins() {
        const tab = new table({
            style    : {'padding-left': 0, 'padding-right': 0},
            head     : ['name', 'abbr', 'balance', 'price', 'cost', 'rate', 'count'],
            colWidths: [10, 10, 20, 20, 15, 25, 20]
        });
        const api = 'https://www.jubi.com/coin/allcoin?t=';

        let coins   = (await urllib.request(api + +(new Date()), {method: 'GET', dataType: 'json'})).data;
        let finance = await this.finance();
        let count   = 0;
        let result  = [];

        for (let item of finance) {
            if (parseInt(item.balance) === 0)
                continue;

            let coin = coins[item.name];

            let rate  = item.cost === 0 ? 0 : ((coin[1] - item.cost) / item.cost) * 100;
            let color = rate < 0 ? 'green' : 'red';
            count += coin[1] * item.balance;

            result.push([
                coin[0],
                item.name,
                item.balance.toFixed(4),
                coin[1],
                item.cost,
                rate === 0 ? '-' : colors[color](rate.toFixed(3) + '%'),
                (coin[1] * item.balance).toFixed(4)
            ]);

        }

        result.push(['合计', '', '', '', '', '', count]);

        result.map(item => tab.push(item));

        return tab.toString();
    }

    static clear() {
        process.stdout.write('\x1B[2J\x1B[3J\x1B[H');
    }
}

module.exports = Api;
