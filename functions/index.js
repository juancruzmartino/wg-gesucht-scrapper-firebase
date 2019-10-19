'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const cheerio = require('cheerio')
const franc = require('franc')
var autoreserve = require('./autoreserve.js');
admin.initializeApp();

let db = admin.firestore();

const HEADERS = { 
    'content-type': 'application/json',
    'User-Agent': 'Chrome/64.0.3282.186 Safari/537.36',
}

exports.crawl = functions.region('europe-west1').https.onRequest(async (req, res) => {

    const FILTER_URL = YOUR FILTER URL

    let roomsRef = db.collection('rooms');
    let result = await axios({
        method: 'get',
        url: FILTER_URL,
        headers: HEADERS
    }).then( response => {
        let $ = cheerio.load(response.data)
        $(".panel.panel-default").each( async function(i, elem) {
            let id = $(this).data('id')
            if(id) {
                let roomQuery = await db.collection('rooms').doc(id.toString()).get()
                if(roomQuery.exists) {
                    return 
                }

                let description = $(this).find('.headline.headline-list-view.noprint.truncate_title a.detailansicht').text().trim()
    
                let data = {
                    'id': id,
                    'price': $(this).find('.detail-size-price-wrapper a.detailansicht').text().split('|')[1].split(' ')[1],
                    'url': 'https://www.wg-gesucht.de/en/' + $(this).find('.detail-size-price-wrapper a.detailansicht').attr('href'),
                    'description': description,
                    'lang': franc(description, {only: ['eng', 'deu']}),
                    'sent': 0
                }
                let setDoc = await db.collection('rooms').doc(data.id.toString()).set(data);
            }
        })
        return
    })
    .catch((error) => {
        console.log(error);
        return res.status(500).send('');
    });
    return res.status(200).send('');
});
exports.autoreserve = functions.region('europe-west1').https.onRequest(async (req, res) => {

    const MESSAGE_ENG = YOUR-MESSAGE-ID
    const MESSAGE_GER = YOUR-MESSAGE-ID
    const credentials = {
        WG_USER: YOUR-USERNAME,
        WG_PASSWORD: YOUR-PASSWORD
    }

    let autoreserveInstance = new autoreserve();
    
    let loginCookie = await autoreserveInstance.login(credentials)

    let headers = { 
        'content-type': 'application/json',
        'User-Agent': 'Chrome/64.0.3282.186 Safari/537.36',
        'cookie': loginCookie
    }

    let messageEng = await autoreserveInstance.getMessage(MESSAGE_ENG, headers)
    let messageGer = await autoreserveInstance.getMessage(MESSAGE_GER, headers)

    let messageTemplates = {
        'eng' : messageEng,
        'ger' : messageGer
    }

    let rooms = []

    let query = await db.collection('rooms').where('sent', '==', 0).get()
    .then(snapshot => {
        if (snapshot.empty) {
            console.log('No matching documents.');
            return
        }  
        snapshot.forEach(doc => {
            rooms.push(doc.data())
        });
        return
    })
    .catch(err => {
        console.log('Error getting documents', err);
        return res.status(500).send('');
    });
    rooms.forEach( async (room) => {
        let messageData = await autoreserveInstance.getMessageData(room.id, headers)
        let messageStatus = await autoreserveInstance.sendMessage(room, headers, messageData, messageTemplates)
        let status = messageStatus ? 1 : 2;
        let result = db.collection('rooms').doc(room.id.toString()).update({sent: status}); 
        return
    });
    return res.status(200).send('');
});
