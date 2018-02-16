const {
    URL
} = require('url');
const http = require('http');
const net = require('net');

const url1 = 'http://store.steampowered.com/app/379430/Kingdom_Come_Deliverance/?snr=1_7_7_230_150_1';
const url2 = "http://store.steampowered.com/agecheck/app/379430/";

http.get(url1, (res) => {
    const {
        statusCode
    } = res;
    console.log(res.headers);
});