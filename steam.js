#! /usr/bin/env node

const program = require('commander');
const chalk = require('chalk');
const cheerio = require('cheerio');
const _ = require('lodash');
const inquirer = require('inquirer');
const ora = require('ora');
const http = require('http');
const iconv = require('iconv-lite');
const mysql = require('mysql');
const moment = require('moment');
/* const cookieParser = require('cookie-parser');
const request = require('request'); */


const BASE_URL = 'http://store.steampowered.com/search/?sort_by=Released_DESC&tags=122%2C1695&category1=998&page=';

let STEAM_HREF = [];
let MODEL = [];
let steamHrefCount = 1;
let prodCount = 0;
let DB_BASE_URL = ''
let DB_NAME = ''
/**
 * 获取详情页链接
 * @param {*} url 
 * @param {*} page 
 * @param {*} i 
 * @param {*} spinner 
 * @param {*} dataInclude 
 * @param {*} db 
 */
const getSteamHref = (url, page, i, spinner, dataInclude, config) => {
    http.get(url + i, (sres) => {
        let chunks = [];

        sres.on('data', chunk => {
            chunks.push(chunk);
        });

        sres.on('end', chunk => {
            let steamHref = '';
            let appid = '';
            let html = Buffer.concat(chunks);
            let $ = cheerio.load(html, {
                decodeEntities: false
            });
            $('#search_result_container').find('a.search_result_row').each((idx, element) => {
                let $element = $(element);
                steamHref = $element.attr('href');
                STEAM_HREF.push({
                    steamHref: $element.attr('href'),
                    appid: $element.attr('data-ds-appid')
                });
            });

            if (i < page) {
                getSteamHref(BASE_URL, page, steamHrefCount++, spinner, dataInclude, config);
            } else {
                spinner.stop().succeed(chalk.green('Successful access to details page url'))
                spinner = ora(chalk.yellow('Starting to Crawl Infomation...')).start()
                spinner.color = 'yellow'
                getSteamInfo(STEAM_HREF, prodCount, spinner, dataInclude, config);
            }
        });
    });
};

const getSteamInfo = (urls, n, spinner, dataInclude, config) => {
    http.get(urls[n].steamHref, sres => {

        let chunks = [];
        sres.on('data', chunk => {
            chunks.push(chunk);
        });
        sres.on('error', (err) => {
            console.log(err);
        });

        sres.on('end', () => {
            let html = Buffer.concat(chunks);
            let $ = cheerio.load(html, {
                decodeEntities: false
            });

            let appid = urls[n].appid;
            let gameName = '';
            let publishdate = '';
            let gametype = '';
            let developers = '';
            let publisher = '';
            let evaluation = '';
            let profilingdata = '';
            let website = '';
            let gameintro = '';
            console.log("appid:" + appid);

            if ($('#agecheck_form').length != 1) {
                console.log(' ')
                console.log('---------------No.' + (n + 1) + '-----------------')
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
                if (appid == 'undefined') {
                    appid = urls[n].appid;
                }



                MODEL.push({
                    appid: appid,
                    gameName: gameName,
                    publishdate: publishdate,
                    gametype: gametype,
                    developers: developers,
                    publisher: publisher,
                    evaluation: evaluation,
                    profilingdata: profilingdata,
                    website: '',
                    gameintro: gameintro,
                    updatetime: moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
                });
                if (n < urls.length - 1) {
                    getSteamInfo(urls, ++prodCount, spinner, '', config);
                } else {
                    spinner.stop().succeed(chalk.green('Success'));
                    saveData(MODEL, DB_BASE_URL, DB_NAME, config);
                }
            }
        })
    })
};


const main = (config) => {
    let connection = mysql.createConnection({
        host: config.answers.dbHost,
        user: config.answers.dbUser,
        password: config.answers.dbPaswd,
        database: config.answers.dbName
    });
    connection.connect((error, connection) => {
        if (error) {
            console.log(chalk.red('😩  Please launcher the mysql servicefirst'))
            console.log('--------------------------------')
        } else {
            console.log(chalk.green('🎉  Connect to the database successfully!'));
            const spinner = ora()
            setTimeout(() => {
                spinner.text = chalk.yellow('Searching details page url...')
                spinner.color = 'yellow'
                spinner.start()
            }, 300);
            getSteamHref(config.baseUrl, config.answers.page, config.steamHrefCount, spinner, '', config);
        }
    });
};

/**
 * 
 * @param {*} obj 
 * @param {*} dbUrl 
 * @param {*} dbName 
 * @param {*} db 
 */
const saveData = (obj, dbUrl, dbName, config) => {
    let connection = mysql.createConnection({
        host: config.answers.dbHost,
        user: config.answers.dbUser,
        password: config.answers.dbPaswd,
        database: config.answers.dbName
    });
    connection.connect();
    obj.forEach(element => {
        if (element.appid != undefined) {
            var addSql = 'INSERT INTO owrpg.steam(appid,game_name,publishdate, gametype,developers, publisher, evaluation, profilingdata, website, updatetime, gameintro) VALUES(?,?,?,?,?,?,?,?,?,?,?)';
            var addSqlParams = [element.appid, element.gameName, element.publishdate, element.gametype, element.developers, element.publisher, element.evaluation, element.profilingdata, '', element.updatetime, element.gameintro];
            connection.query(addSql, addSqlParams, function (err, result) {
                if (err) {
                    console.log('[INSERT ERROR] - ', err.message);
                    return;
                }

                console.log('--------------------------INSERT----------------------------');
                //console.log('INSERT ID:',result.insertId);        
                console.log('INSERT ID:', result);
                console.log('-----------------------------------------------------------------\n\n');
            });
        }
    });
};

program
    .command('run')
    .alias('r')
    .description(chalk.green('Crawl the Steam\'s Game Information'))
    .action(option => {
        let config = _.assign({
            dbHost: '',
            dbName: '',
            dbUser: '',
            dbPaswd: '',
            page: 1,
            title: false,
            time: false,
            imgUrl: false
        }.option);

        let promps = [];

        if (config.dbHost !== 'string') {
            promps.push({
                type: 'input',
                name: 'dbHost',
                message: chalk.cyan('DBHost:'),
                default: 'localhost'
            });
        }

        if (config.dbName !== 'string') {
            promps.push({
                type: 'input',
                name: 'dbName',
                message: chalk.cyan('DBName:'),
                default: 'owrpg'
            });
        }

        if (config.dbUser !== 'string') {
            promps.push({
                type: 'input',
                name: 'dbUser',
                message: chalk.cyan('DBUser:'),
                default: 'root'
            });
        }

        if (config.dbPaswd !== 'string') {
            promps.push({
                type: 'input',
                name: 'dbPaswd',
                message: chalk.cyan('DBPassword:')
            });
        }

        if (config.page !== 'number') {
            promps.push({
                type: 'input',
                name: 'page',
                message: chalk.cyan('How many page you want to Crawl:'),
                default: 1
            });
        }

        inquirer.prompt(promps).then(answers => {
            let config = {
                answers: answers,
                baseUrl: BASE_URL,
                steamHrefCount: steamHrefCount,
            }
            main(config);
        });
    }).on('--help', () => {
        console.log('  Examples:')
        console.log('')
        console.log('$ steamspy run')
        console.log('$ steamspy r')
    });
program.parse(process.argv);