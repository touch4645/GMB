/**
 * Google My Business APIへのHTTPリクエストを行う関数
 * @param {String} endPoint HTTPリクエスト先のURI
 * @param {String} method HTTPリクエストのメソッド
 * @param {Object} payload HTTPリクエストのペイロードデータ
 * @returns {Object} HTTPリクエストのレスポンス
 */
async function request(endPoint, method='GET', payload='') {
    const param = {
        'method' : method,
        'headers' : {
            'Authorization' : 'Bearer ' + ScriptApp.getOAuthToken(),
            'Content-Type' : 'application/json'
        },
        'muteHttpExceptions' : true
    };
  
    if (payload) {
        param['payload'] = JSON.stringify(payload);
    }
  
    const response = await UrlFetchApp.fetch(endPoint, param);
    if (response.getResponseCode() === 200) {
        console.log(response);
        return JSON.parse( response.getContentText() );
    } else {
        throw new Error('This Request was not successful')
    }
}


/**
 * ログインユーザに紐づく全てのGoogle My Businessアカウントを取得する関数
 * @param {String} parentAccount 取得したいアカウントの親アカウント
 * @returns {Array<Object>} Google My Businessのアカウントオブジェクトが格納された配列
 */
async function getAccounts(parentAccount='') {
    const baseUri = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20';
    let result = [];
    let pageToken;

    do {
        let endpoint = baseUri;
        if (pageToken) {       
            endpoint += `&pageToken=${pageToken}`;
        }
        if (parentAccount) {
            endpoint += `&parentAccount=${parentAccount}`;
        }
        await request(endpoint, 'GET').then(response => {
            result = result.concat(response.accounts);
            pageToken = response.nextPageToken;
        });
        await Utilities.sleep(1000);
    } while (pageToken);

    return result;
}


/**
 * アカウントに紐づく全てのGoogle My Businessロケーションを取得する関数
 * @param {Object} account Google My Businessのアカウントオブジェクト
 * @returns {Array<Object>} Google My Businessのロケーションオブジェクトが格納された配列
 */
async function getLocations(account) {
    const baseUri = `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?pageSize=100`
        + '&readMask=name,title,phoneNumbers,categories,storefrontAddress,websiteUri,regularHours,specialHours,serviceArea,latlng,openInfo,metadata,profile,relationshipData,moreHours,serviceItems';
    let result = [];
    let pageToken;

    do {
        let endpoint = baseUri;
        if (pageToken) {       
            endpoint += `&pageToken=${pageToken}`;
        }
        await request(endpoint, 'GET').then(response => {
            result = result.concat(response.locations);
            pageToken = response.nextPageToken;
        });
        await Utilities.sleep(1000);
    } while (pageToken);

    return result;
}


/**
 * 日本で利用可能なカテゴリ一覧を取得する関数
 * ※現在使用不可
 * @returns {Object} カテゴリオブジェクト
 */
async function getCategories() {
    const baseUri = `https://mybusinessbusinessinformation.googleapis.com/v1/categories?regionCode=JP&languageCode=ja&view=FULL`;
    let result = [];
    let pageToken;

    do {
        let endpoint = baseUri;
        if (pageToken) {       
            endpoint += `?pageToken=${pageToken}`;
        }
        await request(endpoint, 'GET').then(response => {
            result = result.concat(response.locations);
            pageToken = response.nextPageToken;
        });
        await Utilities.sleep(1000);
    } while (pageToken);

    return result;
}


/**
 * クエリに該当するロケーションを検索する関数
 * @param {String} query 検索クエリ
 * @returns {Object} 検索結果のロケーションオブジェクト
 */
async function searchLocations(query) {
    const endpoint = 'https://mybusinessbusinessinformation.googleapis.com/v1/googleLocations:search';
    let result;

    const payload = {
        'pageSize' : '10',
        'query' : query,
    }

    await request(endpoint, 'POST', payload).then(response => {
        result = response.locations;
    });
    await Utilities.sleep(1000);

    return result;
}



async function getInsights(account, locations, startTime, endTime) {
    const endpoint = `https://mybusiness.googleapis.com/v4/accounts/${account.name}/locations:reportInsights`;
    
    const payload = {
        // payloadで利用するためlocationオブジェクトからname属性を取り出した新しい配列を作成
        'locationNames' : locations.map(location => location.name), 
        'basicRequest' : {
            'metricRequests': [{
                'metric' : 'ALL',
                'options' : [
                    'AGGREGATED_TOTAL',
                    'AGGREGATED_DAILY'
                ]
            }],
            'timeRange' : {
                'startTime' : startTime,
                'endTime' : endTime
            },
        },
    };
    
    await request(endpoint, 'POST', payload).then(response => {
        result = response.locations;
    });
    await Utilities.sleep(1000);

    return result;
  }