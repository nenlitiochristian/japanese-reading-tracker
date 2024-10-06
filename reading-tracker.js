// ==UserScript==
// @name         Japanese Reading Tracker
// @description  Keeps track of characters read in popular japanese websites like syosetu.com, etc.
// @version      1.0
// @author       nenlitiochristian
// @match        https://syosetu.org/*
// ==/UserScript==

(function () {
    'use strict';
    // visioned use case:
    // open novel ->
    // novel not in db -> pick read chapters (none if new) -> insert db
    // novel in db ->  add chars as you go?

    // only support syosetu.org for now, will add more later

    // credit to cademcniven for this
    const countJapaneseCharacters = (japaneseText) => {
        const regex = /[一-龠]+|[ぁ-ゔ]+|[ァ-ヴー]+|[ａ-ｚＡ-Ｚ０-９]+|[々〆〤ヶ]+/g
        return [...japaneseText.matchAll(regex)].join('').length
    }

    const handleNewNovel = (id) => {
        // assume nothing is already read for now, just init db
        // the data type kept in db is as follows

        // type Novel {
        //     readChapters: Map<String, Chapter> (id, chapter)
        // }

        // type Chapter {
        //     title: string,
        //     characters: number,
        // }

        localStorage.setItem(id, JSON.stringify({
            readChapters: [],
        }))
    }

    // return the currentNovelData
    const handleOldNovel = (id) => {
        // https://syosetu.org/novel/{id}/{chapter}.html
        const currentChapter = window.location.pathname.split("/")[3]
        const currentNovelData = JSON.parse(localStorage.getItem(id))

        // not in a chapter, do nothing
        if (!currentChapter) {
            return currentNovelData;
        }

        const chapterNumber = currentChapter.split(".")[0]

        const chapterContent = document.querySelector("#honbun")
        const chapterText = [...chapterContent.childNodes].map((node) => node.textContent).join("")

        const newChapter = {
            title: document.querySelectorAll('span[style="font-size:120%"]')[1].innerHTML ?? "Unknown",
            characters: countJapaneseCharacters(chapterText),
        }

        currentNovelData.readChapters = { ...currentNovelData.readChapters, [chapterNumber]: newChapter }
        localStorage.setItem(id, JSON.stringify(currentNovelData))
        return currentNovelData;
    }



    // find out the unique identifier of current novel
    // done via urls for syosetu.org, formatted -> https://syosetu.org/novel/{id}/

    const path = window.location.pathname; // gets /novel/{id}

    // if we're not currently in a novel (maybe in home page or settings, etc, we do nothing)
    if (path.split("/")[1] !== "novel") {
        return;
    }

    const novelId = path.split("/")[2]; // gets {id}, hopefully
    if (localStorage.getItem(novelId) === null) {
        console.log("New");
        handleNewNovel(novelId);
    }

    const currentNovel = handleOldNovel(novelId);


    // render the counter?
    // put the characters above the title for now
    // https://syosetu.org/novel/{id}/{chapter}.html
    const currentChapter = window.location.pathname.split("/")[3]

    // not in a chapter, do nothing
    if (!currentChapter) {
        return;
    }

    // get the chapter by finding via id
    const id = currentChapter.split(".")[0]
    const chapter = currentNovel.readChapters[id]
    document.querySelectorAll('span[style="font-size:120%"]')[1].innerHTML = `${chapter.title}（${chapter.characters}）`

})();