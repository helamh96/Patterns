"use strict"

import {model} from "./model.js"
import {presenter} from "./presenter.js"
import {publiSub} from "./pubSub.js"

window.addEventListener("load", function () {
  function getDataModelLogger (topic, p) {
    p.data = model.getActiveNotes("notes", true)
  }
  publiSub.subscribe("getDataPresenter", getDataModelLogger)
  presenter.start()
})
