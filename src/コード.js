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
        return JSON.parse( response.getContentText() );
    } else {
        throw new Error(JSON.stringify({code: response.getResponseCode(), content: response.getContentText(), message: 'This Request was not successful'}))
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
 * @returns {Array<Object>} カテゴリオブジェクトの配列
 */
async function getAllCategories() {
    const baseUri = `https://mybusinessbusinessinformation.googleapis.com/v1/categories?regionCode=JP&languageCode=ja&view=FULL`;
    let result = [];
    let pageToken;

    do {
        let endpoint = baseUri;
        if (pageToken) {       
            endpoint += `?pageToken=${pageToken}`;
        }
        await request(endpoint, 'GET').then(response => {
            result = result.concat(response.categories);
            pageToken = response.nextPageToken;
        });
        await Utilities.sleep(1000);
    } while (pageToken);

    return result;
}


/**
 * 日本で利用可能な属性一覧を取得する関数
 * @returns {Array<Object>} 属性オブジェクトの配列
 */
async function getAllAttributes() {
    const baseUri = `https://mybusinessbusinessinformation.googleapis.com/v1/attributes?regionCode=JP&languageCode=ja&showAll=true`;
    let result = [];
    let pageToken;

    do {
        let endpoint = baseUri;
        if (pageToken) {       
            endpoint += `?pageToken=${pageToken}`;
        }
        await request(endpoint, 'GET').then(response => {
            result = result.concat(response.attributeMetadata);
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
        result = response;
    });
    await Utilities.sleep(1000);

    return result;
}


/**
 * 最大10個のロケーションからインサイトを取得する関数
 * @param {Object} account Google My Businessのアカウントオブジェクト
 * @param {Array<Object>} locations Google My Businessのロケーションオブジェクトが格納された配列
 * ※最大10個まで格納可能
 * @param {String} startTime インサイトの取得開始時間
 * @param {String} endTime インサイトの取得終了時間
 * @returns {Object} 取得されたインサイトデータオブジェクト
 */
async function getInsights(account, locations, startTime, endTime) {
    const endpoint = `https://mybusiness.googleapis.com/v4/${account.name}/locations:reportInsights`;
    let result;
    
    const payload = {
        // payloadで利用するためlocationオブジェクトからname属性を取り出した新しい配列を作成
        'locationNames' : locations.map(location => `${account.name}/${location.name}`), 
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
        result = response;
    });
    await Utilities.sleep(1000);

    return result;
}


/**
 * ロケーションに紐づく属性を取得する関数
 * @param {Object} location Google My Businessのロケーションオブジェクト
 * @returns {Object} 取得した属性オブジェクト
 */
async function getAttributes(location) {
    const endpoint = `https://mybusinessbusinessinformation.googleapis.com/v1/${location.name}/attributes`;
    let result;

    await request(endpoint, 'GET').then(response => {
        result = response;
    });
    await Utilities.sleep(1000);

    return result;
}


/**
 * ロケーションに紐づくGoogleからの更新を取得する関数
 * @param {Object} location Google My Businessのロケーションオブジェクト
 * @returns {Object} 取得したGoogleからの更新オブジェクト
 */
async function getGoogleUpdated(location) {
    const endpoint = `https://mybusinessbusinessinformation.googleapis.com/v1/${location.name}:getGoogleUpdated`
    + '?readMask=name,title,phoneNumbers,categories,storefrontAddress,websiteUri,regularHours,specialHours,serviceArea,latlng,openInfo,metadata,profile,relationshipData,moreHours,serviceItems';
    
    let result;

    await request(endpoint, 'GET').then(response => {
        result = response;
    });
    await Utilities.sleep(1000);

    return result;
}


/**
 * ロケーションに紐づくリンクを取得する関数
 * @param {Object} location Google My Businessのロケーションオブジェクト
 * @returns {Array<Object>} 取得したリンクが格納された配列
 */
async function getPlaceActionLink(location) {
    const baseUri = `https://mybusinessplaceactions.googleapis.com/v1/${location.name}/placeActionLinks`;
    let result = [];
    let pageToken;

    do {
        let endpoint = baseUri;
        if (pageToken) {       
            endpoint += `?pageToken=${pageToken}`;
        }
        await request(endpoint, 'GET').then(response => {
            result = result.concat(response.placeActionLinks);
            pageToken = response.nextPageToken;
        });
        await Utilities.sleep(1000);
    } while (pageToken);

    return result;
}