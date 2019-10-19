const axios = require('axios');
const cheerio = require('cheerio')

function autoreserve() {
    this.login = async function login(credentials) {
        let loginInfo = {
          "login_email_username": credentials.WG_USER,
          "login_password": credentials.WG_PASSWORD,
          "login_form_auto_login":"1",
          "display_language":"de"
        }
      return axios({
          method: 'post',
          url: 'https://www.wg-gesucht.de/ajax/api/Smp/api.php?action=login',
          data: loginInfo,
      }).then( (response) => {
        if(response.status === 200) {
            return response.headers['set-cookie'].toString()
        }
        else return ''
      })
      .catch((error) => {
          console.log(error);
      });
    }
    this.getMessage = async function (messageId, headers) {
        headers 
        return axios({
            method: 'get',
            url: 'https://www.wg-gesucht.de/en/message-template.html?template_id=' + messageId,
            headers: headers
          })
          .then((response) => {
    
            let $ = cheerio.load(response.data)
            return $("#content").text();
          })
          .catch((error) => {
            console.log(error);
        });
    }
    this.getMessageData = async function (roomId, headers) {
        return axios({
            method: 'get',
            url: 'https://www.wg-gesucht.de/en/nachricht-senden.html?message_ad_id='+roomId,
            headers: headers
        })
        .then((response) => {
            const $ = cheerio.load(response.data)
            let csrfToken =  $(".csrf_token").val()
            //let userId =  $("[name='user_id']").val()
            let userId =  $('.logout_button').data('user_id')
            return {
                'userId': userId,
                'csrfToken': csrfToken
            }
        })
    }
    this.sendMessage = async function (room, headers, messageData, messageTemplates) {

        let message = {
            "user_id": messageData.userId,
            "csrf_token": messageData.csrfToken,
            "messages": [
                {
                "content": room.lang === 'eng' ? messageTemplates.eng : messageTemplates.ger,
                "message_type": "text"
                }
            ],
            "ad_type": "0",
            "ad_id": room.id
        }
        return axios({
            method: 'post',
            url: 'https://www.wg-gesucht.de/ajax/api/Smp/api.php?action=conversations',
            headers: headers,
            data: message
        }).then((resp) => {
            return true
        })
        .catch((error) => {
            console.log(error.response.data.detail)
            return false
        });
    }
}
module.exports = autoreserve;