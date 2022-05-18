export const model = (function () {
    let modelInstance
    function init () {
      function readStoredItem (key, fallback = null) {
        const str = localStorage.getItem(key) || fallback
        return JSON.parse(str)
      }
      function writeStoreItem (key, value) {
        localStorage.setItem(key, JSON.stringify(value))
      }
  
  
      function getNotes(active = true){
          if(readStoredItem("notes")){
            const data = readStoredItem("notes")
            if(active){
              return Object.keys(data)
                .reduce((activeNotes, ids) => {
                  if (data[ids].active && data[ids].passFilter) {
                    activeNotes[ids] = data[ids]
                  }
                  return activeNotes
                }, {})
            }
            return data
          }
          else {writeStoreItem("notes", { })}
      }
  
      function getCommandHistory(){
        const data = readStoredItem("commandsHistorial");
        return data;
      }
  
      function updatePrevConf (inverse) {
        const commands = readStoredItem("commandsHistorial", "{}")
        const lastIndex = getLastIndex(commands)
        commands[String(lastIndex + 1)] = inverse
        writeStoreItem("commandsHistorial", commands)
      }
      function saveNoteDataBase (obj) {
        const data = readStoredItem("notes", "{}")
        const ids = obj.ids
        delete obj.ids
        data[ids] = obj
        writeStoreItem("notes", data)
      }
  
      function updateData (ids, filter, indx = "notes") {
        if (indx === "commandsHistorial") {
          writeStoreItem("commandsHistorial", filter.commands)
          return
        }
        let data = readStoredItem("notes")
        let difNote = [false, ""]
        if ("note" in filter) {
          if (filter.note !== data[ids].note) {
            difNote = [true, data[ids].note]
            data[ids].note = filter.note
            data[ids].lastMod = filter.lastMod.toString()
          }
        } else if ("data" in filter) {
          data = filter.data
        } else {
          for (const key in filter) {
            data[ids][key] = filter[key]
          }
        }
        writeStoreItem("notes", data)
        return difNote
      }
  
      function updateNotes (data) {
        writeStoreItem("notes", data)
      }
  
      class NotesInformation {
        constructor (note) {
          const d = Date.now()
          this.ids = d
          this.creaDate = d
          this.lastMod = d
          this.note = note
          this.active = true
          this.passFilter = true
        }
      }
      function ModelFactory () { }
      ModelFactory.prototype.createNote = function (note) {
        return new NotesInformation(note)
      }
      const noteFactory = new ModelFactory()
      const UndoOptions = {
        updateNote ({ command, ids }) {
          updateNote(command.text, ids, true)
        },
        saveNote ({ data }) {
          const lastIndex = getLastIndex(data)
          delete data[lastIndex]
          updateData("-1", { data }, "notes")
        },
        deleteNote ({ ids }) {
          updateData(ids, { active: true })
        },
        interchange ({ command }) {
          interchangeNotes(command.start, command.end, true)
        }
      }
  
      function undoAction () {
        const commands = getCommandHistory()
        const data = getNotes (false)
        const lastIndex = getLastIndex(commands)
  
        if (!data) {
          return
        }
        else if (lastIndex in commands) {
          const reverseCommand = commands[lastIndex]
          delete commands[lastIndex]
          const ids = reverseCommand.ids || ""
          const undoAction = UndoOptions[reverseCommand.command]
          if (undoAction) {
            undoAction({ command: reverseCommand, ids, data })
            updateData("-1", { commands: commands }, "commandsHistorial")
          }
        }
      }
  
      function deleteNote (ids) {
        updateData(ids, { active: false })
        updatePrevConf({ command: "deleteNote", ids })
      }
  
      function saveNote (note) {
        const obj = noteFactory.createNote(note)
        if (obj.note !== "") {
          saveNoteDataBase(obj)
          updatePrevConf({ command: "saveNote" })
        }
      }
  
      function updateNote (note, ids, reversing = false) {
        if (note) {
          const filter = { note, lastMod: Date.now() }
          const [dif, text] = updateData(ids, filter)
          if (!reversing) {
            if (dif) {
              updatePrevConf({ ids, command: "updateNote", text })
            }
          }
        }
      }
  
      function getDate (ids, opt) {
        const data = getNotes(true)
        return opt === "creation"
          ? data[ids].creaDate
          : data[ids].lastMod
      }
  
      function filterNotes (filter) {
        const notes = getNotes(false)
        for (const n of Object.values(notes)) {
          n.passFilter = n.note.includes(filter)
        }
        updateNotes(notes)
      }
  
      function interchangeNotes (startingPlace, endingPlace, reversing = false) {
        const data = getNotes(false)
        const keepingNote = data[startingPlace]
        data[startingPlace] = data[endingPlace]
        data[endingPlace] = keepingNote
        if (!reversing) {
          updatePrevConf({
            command: "interchange",
            start: endingPlace,
            end: startingPlace
          })
        }
        updateNotes(data)
      }
      function getLastIndex (obj) {
        const indices = Object.keys(obj).map(num => parseInt(num, 10))
        const lastIndex = indices.length > 0 ? Math.max(...indices) : 0
        return lastIndex
      }
      return {
        saveNote,
        deleteNote,
        updateNote,
        getDate,
        filterNotes,
        interchangeNotes,
        undoAction,
        getActiveNotes: getNotes
      }
    }
    return {
      getInstance: function () {
        if (!modelInstance) {
          modelInstance = init()
        }
        return modelInstance
      }
    }
  })().getInstance()
