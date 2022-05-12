"use strict"

window.addEventListener("load", function () {
  function getDataModelLogger (topic, p) {
    p.data = model.getActiveNotes("notes", true)
  }
  publiSub.subscribe("getDataPresenter", getDataModelLogger)
  presenter.start()
})
