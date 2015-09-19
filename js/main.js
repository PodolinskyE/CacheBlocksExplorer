var app
$(function () {
  app = new App()
})

var App = function () {
  this.databaseSelect = $('#databaseSelect')
  this.viewType = $('#viewType')
  this.database = null

  this.elements = {
    viewType: $('#viewType').get(0),
    blocksViewer: $('#blocksViewer').get(0),
    zoomInBtn: $('#btnZoomIn').get(0),
    zoomOutBtn: $('#btnZoomOut').get(0),
    zoomToFitBtn: $('#btnZoomToFit').get(0),
    downloadSVGBtn: $('#btnDownloadSVG').get(0),
    downloadPNGBtn: $('#btnDownloadPNG').get(0),
    mapViewer: $('#map').get(0)
  }

  this.blocksViewer = new BlocksViewer(this, this.elements.blocksViewer)

  this.mapViewer = new MapViewer(this, this.elements.mapViewer)

  this.init()

  return this
}

App.prototype.load = function (url, data, callback) {
  var self = this

  $.ajax({
    url: url,
    type: data ? 'POST' : 'GET',
    data: data,
    dataType: 'json',
    complete: function () {

    },
    success: function (data, status) {
      callback.apply(self, [data, status])
    }
  })
}

App.prototype.updateDatabases = function (data) {
  var self = this

  this.databaseSelect.find('option').remove()

  $('<option>')
    .text('Please select database')
    .val('')
    .appendTo(self.databaseSelect)

  $.each(data, function (i, val) {
    $('<option>')
      .val(val.directory)
      .text(val.name)
      .attr('data-blocks', val.blocks)
      .appendTo(self.databaseSelect)
  })

  self.databaseSelect.attr('disabled', false)
}

App.prototype.setDatabase = function (directory, blocks) {
  var self = this

  this.database = directory

  if (this.viewType.is(':checked')) {
    this.mapViewer.get(directory, blocks)
  } else {
    this.blocksViewer.reset()
    this.blocksViewer.get(3)
  }
}

App.prototype.reset = function () {
  this.blocksViewer.reset()
  this.mapViewer.reset()
  this.databaseSelect.find('option:first').attr('selected', true)
}

App.prototype.init = function () {
  var self = this

  this.viewType.on('change', function () {
    self.reset()
  })

  this.databaseSelect.on('change', function (event) {
    var directory = self.databaseSelect.val()
    if (directory !== self.database) {
      if (directory === '') {
        self.reset()
      } else {
        var blocks = $('option:selected', self.databaseSelect).attr('data-blocks')
        self.setDatabase(directory, blocks)
      }
    }
  })

  this.load('rest/dblist', null, function (data) {
    self.updateDatabases(data)
  })
}