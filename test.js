var request = require("request").defaults({
    jar: true
});
var tough = require('tough-cookie');

const program = require('commander');
const chalk = require('chalk');
const cheerio = require('cheerio');
const _ = require('lodash');
const inquirer = require('inquirer');
const ora = require('ora');
const http = require('http');
const iconv = require('iconv-lite');
const mysql = require('mysql');
const cookieParser = require('cookie-parser');

var j = request.jar();
/**
 * 获取www.xicidaili.com提供的免费代理
 */
function getXici() {

    url1 = 'http://store.steampowered.com/app/379430/Kingdom_Come_Deliverance/?snr=1_7_7_230_150_1';
    url2 = "http://store.steampowered.com/agecheck/app/379430/"; // 国内高匿代理

    let options = {
        host: 'store.steampowered.com',
        path: '/agecheck/app/379430/',
        port: 80,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': 105
        }
    }
    const req = http.request(options, (res) => {
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        let chunks = [];
        res.on('data', chunk => {
            chunks.push(chunk);
        });
        res.on('end', () => {
            let html = Buffer.concat(chunks);
            let $ = cheerio.load(html, {
                decodeEntities: false
            });
            let appid = '';
            let gameName = '';
            let publishdate = '';
            let gametype = '';
            let developers = '';
            let publisher = '';
            let evaluation = '';
            let profilingdata = '';
            let website = '';
            let gameintro = '';


            $('.page_content_ctn').find('div.apphub_AppName').each((idx, element) => {
                let $element = $(element)
                gameName = $element.text();
                console.log("游戏名称：" + gameName);
            })

            $('.page_content_ctn').find('div.game_description_snippet').each((idx, element) => {
                let $element = $(element)
                gameintro = $element.text().trim();
                console.log("游戏介绍：" + gameintro);
            });

            let evaluationIndex = 0;
            if ($('.page_content_ctn').find('div.glance_ctn_responsive_left').find('div.user_reviews_summary_row').length == 2) {
                evaluationIndex = 1;
            } else {
                evaluationIndex = 0;
            }

            $('.page_content_ctn').find('div.glance_ctn_responsive_left').find('div.user_reviews_summary_row').eq(evaluationIndex).each((idx, element) => {
                let $element = $(element)
                profilingdata = $element.attr('data-store-tooltip');
                console.log("评测详细：" + profilingdata);
            });

            evaluation = $('.page_content_ctn').find('div.glance_ctn_responsive_left').find('div.user_reviews_summary_row').eq(evaluationIndex).find('span').first().text();
            console.log("全部评测：" + evaluation);

            $('.page_content_ctn').find('div.glance_ctn_responsive_left').find('div.release_date').find('div.date').each((idx, element) => {
                let $element = $(element)
                publishdate = $element.text();
                console.log("发行日期：" + publishdate);
            });

            $('.page_content_ctn').find('div.glance_ctn_responsive_left').find('div.dev_row').eq(0).find('a').each((idx, element) => {
                let $element = $(element)
                developers = $element.text();
                console.log("开发商：" + developers);
            });

            $('.page_content_ctn').find('div.glance_ctn_responsive_left').find('div.dev_row').eq(1).find('a').each((idx, element) => {
                let $element = $(element)
                publisher = $element.text();
                console.log("发行商：" + publisher);
            });

            $('.page_content_ctn').find('div.glance_ctn_responsive_right').find('div.popular_tags_ctn').find('a').each((idx, element) => {
                if (idx < 5) {
                    let $element = $(element);
                    gametype += $element.text().trim() + ",";
                }

            });
            console.log("类型：" + gametype);
            appid = $('.page_content_ctn').find('div.glance_ctn_responsive_right').find('div.glance_tags').first().attr('data-appid');
            console.log("appid：" + appid);

        })

    }).setHeader('Set-Cookie', ['lastagecheckage=5-March-1982', 'steamCountry=CN%7Ce005ede41030fc1e1a17645540a15c23'])
}
getXici(); //启动这个爬虫