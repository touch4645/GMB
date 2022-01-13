/**
 * Google APIへHTTPリクエストを行う関数
 * @param {String} endPoint HTTPリクエスト先のURI
 * @param {String} method HTTPリクエストのメソッド
 * @param {Object} payload HTTPリクエストのペイロードデータ
 * @returns {Object} HTTPリクエストのレスポンス
 */
async function _request(endPoint, method='GET', payload='') {
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
 * ログインユーザに紐づく全てのBusiness Information APIのアカウントを取得する関数
 * @param {String} parentAccount 取得したいアカウントの親アカウントname属性
 * @returns {Array<Object>} Business Information APIのアカウントオブジェクトが格納された配列
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
 * アカウントに紐づく全てのBusiness Information APIのロケーションオブジェクトを取得する関数
 * @param {String} accountName Business Information APIのアカウントオブジェクトのname属性
 * @returns {Array<Object>} Business Information APIのロケーションオブジェクトが格納された配列
 */
async function getLocations(accountName) {
    const baseUri = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?pageSize=100`
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
 * @returns {Array<Object>} カテゴリオブジェクトの配列
 */
async function searchAllCategories() {
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
async function searchAllAttributes() {
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
 * ※廃止予定のGoogle My Business API v4.9を使用
 * @param {String} accountName Business Information APIのアカウントオブジェクトのname属性
 * @param {Array<String>} locationNames Business Information APIのロケーションオブジェクトのname属性が格納された配列
 * ※最大10個まで格納可能
 * @param {String} startTime インサイトの取得開始時間
 * @param {String} endTime インサイトの取得終了時間
 * @returns {Object} 取得されたインサイトデータオブジェクト
 */
async function getInsights(accountName, locationNames, startTime, endTime) {
    const endpoint = `https://mybusiness.googleapis.com/v4/${accountName}/locations:reportInsights`;
    let result;
    
    const payload = {
        // payloadで利用するためlocationオブジェクトからname属性を取り出した新しい配列を作成
        'locationNames' : locationNames.map(locationName => `${accountName}/${locationName}`), 
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
 * @param {String} locationName Business Information APIのロケーションオブジェクトのname属性
 * @returns {Object} 取得した属性オブジェクト
 */
async function getAttributes(locationName) {
    const endpoint = `https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}/attributes`;
    let result;

    await request(endpoint, 'GET').then(response => {
        result = response;
    });
    await Utilities.sleep(1000);

    return result;
}


/**
 * ロケーションに紐づくGoogleからの更新を取得する関数
 * @param {String} locationName Business Information APIのロケーションオブジェクトのname属性
 * @returns {Object} 取得したGoogleからの更新オブジェクト
 */
async function getGoogleUpdated(locationName) {
    const endpoint = `https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}:getGoogleUpdated`
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
 * @param {String} locationName Business Information APIのロケーションオブジェクトのname属性
 * @returns {Array<Object>} 取得したリンクが格納された配列
 */
async function getPlaceActionLink(locationName) {
    const baseUri = `https://mybusinessplaceactions.googleapis.com/v1/${locationName}/placeActionLinks`;
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


/**
 * クエリに該当するチェーン店舗を検索する関数
 * @param {String} query 検索クエリ
 * @returns {Object} 検索結果のチェーンオブジェクト
 */
async function searchChains(query) {
    const endpoint = `https://mybusinessbusinessinformation.googleapis.com/v1/chains:search?chainName=${query}&pageSize=500`;
    let result;

    await request(endpoint, 'GET').then(response => {
        result = response;
    });
    await Utilities.sleep(1000);

    return result;
}


/**
 * ロケーションに紐づく投稿を取得する関数
 * ※廃止予定のGoogle My Business API v4.9を使用
 * @param {String} accountName Business Information APIのアカウントオブジェクトのname属性
 * @param {String} locationName Business Information APIのロケーションオブジェクトのname属性
 * @returns {Array<Object>} 取得した投稿が格納された配列
 */
async function getLocalPosts(accountName, locationName) {
    const baseUri = `https://mybusiness.googleapis.com/v4/${accountName}/${locationName}/localPosts?pageSize=100`;
    let result = [];
    let pageToken;

    do {
        let endpoint = baseUri;
        if (pageToken) {       
            endpoint += `&pageToken=${pageToken}`;
        }
        await request(endpoint, 'GET').then(response => {
            result = result.concat(response.localPosts);
            pageToken = response.nextPageToken;
        });
        await Utilities.sleep(1000);
    } while (pageToken);

    return result;
}


/**
 * ロケーションに紐づく口コミを取得する関数
 * ※廃止予定のGoogle My Business API v4.9を使用
 * @param {String} accountName Business Information APIのアカウントオブジェクトのname属性
 * @param {String} locationName Business Information APIのロケーションオブジェクトのname属性
 * @returns {Array<Object>} 取得した口コミが格納された配列
 */
async function getReviews(accountName, locationName) {
    const baseUri = `https://mybusiness.googleapis.com/v4/${accountName}/${locationName}/reviews?pageSize=50`;
    let result = [];
    let pageToken;

    do {
        let endpoint = baseUri;
        if (pageToken) {       
            endpoint += `&pageToken=${pageToken}`;
        }
        await request(endpoint, 'GET').then(response => {
            result = result.concat(response.reviews);
            pageToken = response.nextPageToken;
        });
        await Utilities.sleep(1000);
    } while (pageToken);

    return result;
}