function saveOptions(button) {
    var city = document.getElementById('city').value;
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
                    lng: responseData.results[0].geometry.location.lng
                }, function() {
                    // Update status to let user know options were saved.
                    //alert('Settings Saved');
                });
            } else {
                alert('City name is not correct');
            }
        }
    }
}
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
dateBox.innerHTML = new Date().toString();
(function updateTime() {
    setTimeout(function() {
        var dateBox = document.getElementById('todaysTime');
        dateBox.innerHTML = new Date().toString();
        updateTime();
    }, 1000);
})();
//Update Prayer Time
(function() {
    chrome.storage.sync.get({
        city: '',
        lat: '',
        lng: ''
    }, function(info) {
        document.getElementById('city').value = info.city;
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
    var changedCity = false;
    var info = {};
    for (var key in changes) {
        var storageChange = changes[key];
        if (key == 'city' || key == 'lat' || key || 'lng') {
            changedCity = true;
            info[key] = storageChange.newValue;
        }
    }
    if (Object.keys(info).length === 3) {
        changePrayerTime(info)
    }
});

function changePrayerTime(info) {
    var prayer = new PrayerTime().getTimes(new Date(), [info.lat, info.lng], getTimeZone());
    document.querySelector('table tbody tr td:nth-of-type(1)').innerHTML = prayer.fajr;
    document.querySelector('table tbody tr td:nth-of-type(2)').innerHTML = prayer.dhuhr;
    document.querySelector('table tbody tr td:nth-of-type(3)').innerHTML = prayer.asr;
    document.querySelector('table tbody tr td:nth-of-type(4)').innerHTML = prayer.maghrib;
    document.querySelector('table tbody tr td:nth-of-type(5)').innerHTML = prayer.isha;
}
