"use strict";

function saveOptions(button) {
    var city = document.getElementById('city').value;
    var timezone = getTimeZone();
    var xmlhttp = new XMLHttpRequest()
    var responseData;
    xmlhttp.open("GET", "https://maps.googleapis.com/maps/api/geocode/json?address=" + city + "&sensor=true_or_false", true);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            button.innerHTML = 'Save';
            responseData = JSON.parse(xmlhttp.responseText);
            //console.log(responseData);
            if (responseData.results.length > 0) {
                chrome.storage.sync.set({
                    city: city,
                    lat: responseData.results[0].geometry.location.lat,
                    lng: responseData.results[0].geometry.location.lng,
                    timezone: timezone
                }, function() {
                    // Update status to let user know options were saved.
                    //alert('Settings Saved');
                    document.getElementById('timezone').value = timezone
                });
            } else {
                alert('City name is not correct');
            }
        }
    }
}

function time24Hrs(dt) {
    var formatted = '';
    if (dt) {
        var hours24 = dt.getHours();
        var minutes = dt.getMinutes();
        formatted = [dt.getHours(), dt.getMinutes()].join(":");
    }
    var time = formatted.split(":")[0].length == 1 ? ("0" + formatted.trim()) : formatted.trim();
    time = time.split(":")[1].length == 1 ? (time.split(":")[0] + ":0" + time.split(":")[1]) : time;
    return time;
};
// Event listener for button
var buttonSave = document.getElementById('saveOption');
saveOption.addEventListener("click", function(e) {
    e.preventDefault();
    this.innerHTML = 'Saving...';
    saveOptions(this);
}, false);
/**
 * Update Clock
 **/
var dateBox = document.getElementById('todaysTime');
dateBox.innerHTML = new Date().today() + " " + new Date().timeNow();
(function updateTime() {
    setTimeout(function() {
        var date = new Date();
        dateBox.innerHTML = date.today() + " " + date.timeNow();
        timeRemainingInNextPrayer();
        updateTime();
    }, 1000);
})();
//Update Prayer Time
(function() {
    chrome.storage.sync.get({
        city: '',
        lat: '',
        lng: '',
        timezone: '',
    }, function(info) {
        document.getElementById('city').value = info.city;
        document.getElementById('timezone').value = info.timezone;
        changePrayerTime(info);
    });
})();

function getTimeZone() {
    var z = new Date();
    z = z.toString().split(" ")[5].split(/[a-zA-Z]/);
    z = z[z.length - 1].split("+")[1];
    return z.slice(0, 2) + "." + z.slice(2);
};
// change listner for google chrome local storage
chrome.storage.onChanged.addListener(function(changes, namespace) {
    timeRemainingInNextPrayer();
    var changedCity = false;
    var info = {};
    //console.log(changes);
   
        for (var key in changes) {
            var storageChange = changes[key];
            if (key == 'city' || key == 'lat' || key == 'lng' || key == 'timezone') {
                changedCity = true;
                info[key] = storageChange.newValue;
            }
        }
        if (Object.keys(info).length == 4) {
            document.getElementById('city').value = info.city;
            document.getElementById('timezone').value = info.timezone;
            changePrayerTime(info)
        }
    
});

function changePrayerTime(info) {
    var timezone = getTimeZone();
    if (typeof info.timezone != 'undefined' && info.timezone != '') {
        timezone = info.timezone;
    }
    var prayer = new PrayerTime().getTimes(new Date(), [info.lat, info.lng], timezone);
    document.querySelector('table tbody tr td:nth-of-type(1)').innerHTML = prayer.fajr;
    document.querySelector('table tbody tr td:nth-of-type(2)').innerHTML = prayer.dhuhr;
    document.querySelector('table tbody tr td:nth-of-type(3)').innerHTML = prayer.asr;
    document.querySelector('table tbody tr td:nth-of-type(4)').innerHTML = prayer.maghrib;
    document.querySelector('table tbody tr td:nth-of-type(5)').innerHTML = prayer.isha;
}

function getPrayerTimes(info) {
    var timezone = getTimeZone();
    if (typeof info.timezone != 'undefined' && info.timezone != '') {
        timezone = info.timezone;
    }
    return (new PrayerTime().getTimes(new Date(), [info.lat, info.lng], timezone));
}

function getNextPrayerTime(pt) {
    var array = [],
        sortedArray = [];
    for (var key in pt) {
        if (pt.hasOwnProperty(key)) {
            array.push(pt[key]);
        }
    };
    sortedArray = array.sort(function(a, b) {
        return new Date('1970/01/01 ' + a) - new Date('1970/01/01 ' + b);
    });
    for (var i = 0; i < sortedArray.length; i++) {
        var ct = time24Hrs(new Date()),
            at = sortedArray[i];
        if (ct < at) {
            var prayerName = getObjProp(pt, at),
                prayerObject = {};
            prayerObject[prayerName] = at;
            return prayerObject;
        }
    }
}

function timeRemainingInNextPrayer() {
    chrome.storage.sync.get({
        city: '',
        lat: '',
        lng: '',
        timezone: '',
    }, function(info) {
        if (typeof info.city != 'undefined') {
            var pt = getPrayerTimes(info);
            delete pt['imsak'];
            delete pt['midnight'];
            delete pt['sunrise'];
            delete pt['sunset'];
            console.log(pt);
            var nextPt = getNextPrayerTime(pt);
            var timeRemainingObj = get_time_difference(new Date('1970/01/01 ' + time24Hrs(new Date())), new Date('1970/01/01 ' + nextPt[Object.keys(nextPt)[0]]));
            var string = "Next Prayer in " + timeRemainingObj.duration;
            document.getElementById('timeRemaingNextPrayer').innerHTML = string;
            var table = document.querySelector("table tbody tr");
            var tds = table.getElementsByTagName("td");
            for (var i = 1; i <= tds.length; i++) {
                document.querySelector('table tbody tr td:nth-of-type(' + i + ')').classList.remove('alert');
                document.querySelector('table tbody tr td:nth-of-type(' + i + ')').classList.remove('alert-success');
            }
            document.getElementById(Object.keys(nextPt)[0]).classList.add('alert');
            document.getElementById(Object.keys(nextPt)[0]).classList.add('alert-success');
        }
    });
}

function get_time_difference(earlierDate, laterDate) {
    var oDiff = new Object();
    //  Calculate Differences
    //  -------------------------------------------------------------------  //
    var nTotalDiff = laterDate.getTime() - earlierDate.getTime();
    oDiff.days = Math.floor(nTotalDiff / 1000 / 60 / 60 / 24);
    nTotalDiff -= oDiff.days * 1000 * 60 * 60 * 24;
    oDiff.hours = Math.floor(nTotalDiff / 1000 / 60 / 60);
    nTotalDiff -= oDiff.hours * 1000 * 60 * 60;
    oDiff.minutes = Math.floor(nTotalDiff / 1000 / 60);
    nTotalDiff -= oDiff.minutes * 1000 * 60;
    oDiff.seconds = Math.floor(nTotalDiff / 1000);
    //  -------------------------------------------------------------------  //
    //  Format Duration
    //  -------------------------------------------------------------------  //
    //  Format Hours
    var hourtext = '00';
    if (oDiff.hours > 0) {
        hourtext = String(oDiff.hours);
    }
    if (hourtext.length == 1) {
        hourtext = '0' + hourtext
    };
    //  Format Minutes
    var mintext = '00';
    if (oDiff.minutes > 0) {
        mintext = String(oDiff.minutes);
    }
    if (mintext.length == 1) {
        mintext = '0' + mintext
    };
    //  Format Seconds
    var sectext = '00';
    if (oDiff.seconds > 0) {
        sectext = String(oDiff.seconds);
    }
    if (sectext.length == 1) {
        sectext = '0' + sectext
    };
    //  Set Duration
    var sDuration = hourtext + ':' + mintext;
    oDiff.duration = sDuration;
    //  -------------------------------------------------------------------  //
    return oDiff;
}

function getObjProp(obj, value) {
    for (var x in obj) {
        if (obj[x] == value) return x;
    }
}