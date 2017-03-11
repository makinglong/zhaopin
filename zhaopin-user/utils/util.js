var QQMapWX = require('qqmap-wx-jssdk.min.js');

// 实例划API核心类
var demo = new QQMapWX({
    key: 'SK3BZ-K7BW3-OOF3F-YLRQU-UQ5M2-TLFHN' // 必填
});

function formatTime(date) {
    var year = date.getFullYear()
    var month = date.getMonth() + 1
    var day = date.getDate()

    var hour = date.getHours()
    var minute = date.getMinutes()
    var second = date.getSeconds()


    return [year, month, day].map(formatNumber).join('-') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

function formatDate(date) {
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();

    return [year, month, day].map(formatNumber).join('-');
}

function formatNumber(n) {
    n = n.toString();
    return n[1] ? n : '0' + n
}

/**
 * @param  {[obj]} app
 * @return {[string]}location
 */
function getLocationAddress(app, cb) {
    wx.getLocation({
        //      type:'gcj02',
        success: function(res) {
            console.log(res);
            var location = res.latitude + ',' + res.longitude;
            wx.request({
                url: 'http://apis.map.qq.com/ws/geocoder/v1/',
                data: {
                    location: location,
                    key: '7YHBZ-KIT3W-R5BRE-RNQUQ-NAOCE-M7BVE'
                },
                method: 'GET',
                success: function(res) {
                    console.log(res);
                    app.globalData.location = res.data.result.address_component.city.substring(0, res.data.result.address_component.city.length - 1);
                    //默认期待工作地点为当地
                    if (app.globalData.workplaceCity == '') {
                        app.globalData.workplaceCity = app.globalData.location;
                        app.globalData.workplaceDistrict = app.globalData.location;
                        wx.setStorageSync('workplaceCity', app.globalData.workplaceCity);
                        wx.setStorageSync('workplaceDistrict', app.globalData.workplaceDistrict);
                        typeof cb == 'function' && cb();
                    }
                }
            })
        },
        fail: function() {
            //当用户拒绝授权时,采用默认地点------全国
            console.log('用户拒绝授权获取当前地址,采用默认地点---全国')
            app.globalData.location = '全国';
            //默认期待工作地点为当地
            if (app.globalData.workplaceCity == '') {
                app.globalData.workplaceCity = app.globalData.location;
                app.globalData.workplaceDistrict = app.globalData.location;
                wx.setStorageSync('workplaceCity', app.globalData.workplaceCity);
                wx.setStorageSync('workplaceDistrict', app.globalData.workplaceDistrict);
                typeof cb == 'function' && cb();
            }
        }
    })
}

/**
 * @param  {[string]} 城市名字
 * @param  {[array]}  城市列表
 * @param  {[obj]} page
 * @return {[type]} 返回城市区县
 */
function getDistrictByCityName(str, cityList, page) {
    console.log(str);
    var id = 0;
    for (var i = 0; i < cityList.length; i++) {
        if (str == cityList[i].name) {
            id = cityList[i].id;
            break;
        }
    }
    if (id === 0) {
        console.log('找不到城市对应 id');
        return false;
    }

    demo.getDistrictByCityId({
        id: id, // 对应城市ID
        success: function(res) {
            page.setData({
                citycidx: res.result[0]
            })
        },
        fail: function(res) {
            console.log(res);
        }
    });
}

/**
 * @return {[type]}  调用腾讯地图开放平台API 获取城市列表
 */
function getCityList(self) {
    var cityList = [];
    var cityMsg;
    demo.getCityList({
        success: function(res) {
            var result = res.result;
            console.log(result);
            for (var i = 0; i < result.length; i++) {
                for (var j = 0; j < result[i].length; j++) {
                    cityMsg = getCityMsg(result[i][j]);
                    if (!isEmptyObject(cityMsg)) {
                        cityList.push(cityMsg);
                    }
                }
            }
            wx.setStorageSync('cityList', cityList);
            self.globalData.cityList = cityList;
        },
        fail: function(res) {
            console.log(res);
        }
    });
}


/**
 * 城市信息处理，去除省级
 * @param  {obj} 城市信息
 * @return {obj} 城市信息
 */
function getCityMsg(obj) {
    var cityMsg = {};
    if (obj.fullname.indexOf('省') === -1) { //省级
        if (obj.hasOwnProperty('cidx')) {
            cityMsg.cidx = obj.cidx;
            cityMsg.fullname = obj.fullname;
            cityMsg.name = obj.name;
            cityMsg.id = obj.id;
            cityMsg.pinyin = obj.pinyin;
        }
    }
    return cityMsg;
}

/**
 * @param  {obj} 
 * @return {Boolean}
 */
function isEmptyObject(o) {
    var t;
    for (t in o)
        return !1;
    return !0
}

/**
 * [inArray description]
 * @param  {[type]} value [description]
 * @param  {[type]} array [description]
 * @return {[int]} 返回index 不存在返回-1
 */
function inArray(value, array) {
    var t;
    for (t in array)
        if (array[t] == value) {
            return t
        }
    return -1;
}

/**
 * [ajax description] 发起网络请求 
 * @param  {[type]} options.url     [description]
 * @param  {[type]} options.method: 'GET'         [description]
 * @param  {[type]} options.data:   {}          [description]
 * @return {[type]}                 [description] 返回promise对象
 */
function ajax({
    url,
    method = 'GET',
    data = {},
}) {
    return new Promise((resolve, reject) => {
        wx.request({
            header: {
                'Cookie': 'JSESSIONID=' + wx.getStorageSync('session').sessionId
            },
            url: url,
            method: method,
            data: data,
            success: function(res) {
                resolve(res)
            },
            fail: function(res) {
                reject(res)
            }
        })
    })
}

/**
 * [ajaxCheckSession description] wx.checkSession
 * @return {[type]} [description] 返回promise
 */
function ajaxCheckSession() {
    return new Promise((resolve, reject) => {
        wx.checkSession({
            success: resolve(),
            fail: reject()
        })
    })
}

/**
 * [ajaxLogin description] wx.login
 * @return {[type]} [description] 返回promise
 */
function ajaxLogin() {
    return new Promise((resolve, reject) => {
        wx.login({
            success: function(res) {
                resolve(res)
            },
            fail: function(res) {
                reject(res)
            }
        })
    })
}

module.exports = {
    formatTime: formatTime,
    formatDate: formatDate,
    getLocationAddress: getLocationAddress,
    getCityList: getCityList,
    getDistrictByCityName: getDistrictByCityName,
    inArray: inArray,
    isEmptyObject: isEmptyObject,
    ajax: ajax,
    ajaxCheckSession: ajaxCheckSession,
    ajaxLogin: ajaxLogin
}