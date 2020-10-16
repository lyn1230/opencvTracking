let showToast = function(description, duration=1500, icon='success'){
  wx.showToast({
    title: description,
    duration: duration,
    icon: icon
  })
};


module.exports = {
  alert: showToast
};