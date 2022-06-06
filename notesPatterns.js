import models from "./model.js"
import {publiSub} from "./pubSub.js"
import  presenters from "./presenter.js"

export const presenter=presenters(publiSub).getInstance()
export const model=models().getInstance()

window.addEventListener("load", function () {
  function getDataModelLogger() {
    let p=arguments[1]
    p.data=model.getActiveNotes("notes", true)
  }
  publiSub.subscribe("getDataPresenter", getDataModelLogger)
  presenter.start()
})
