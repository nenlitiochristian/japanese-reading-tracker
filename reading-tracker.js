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
    function countJapaneseCharacters(japaneseText) {
        const regex = /[一-龠]+|[ぁ-ゔ]+|[ァ-ヴー]+|[ａ-ｚＡ-Ｚ０-９]+|[々〆〤ヶ]+/g
        return [...japaneseText.matchAll(regex)].join('').length
    }

    function handleNewNovel(id) {
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
    function handleOldNovel(id) {
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

    function countTotalCharacters(novel) {
        let counter = 0;
        Object.entries(novel.readChapters).forEach(([_, value]) => {
            counter += value.characters
        });
        return counter;
    }

    function main() {
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
        renderCounter(currentNovel);
    }

    function renderCounter(currentNovel) {
        // render the counter?
        // for syosetu.org, put the characters after the title if it's a chapter
        // if it's the chapter list page, list the total characters and tracked characters on each chapter item

        // https://syosetu.org/novel/{id}/{chapter}.html
        const paths = window.location.pathname.split("/")

        const isOnChapterList = paths[1] === "novel" && paths[2]
        const currentChapter = paths[3]

        if (isOnChapterList) {
            // get the table, add total
            const table = document.querySelector('table')

            const row = document.createElement("tr")
            const cell = document.createElement("td")
            cell.textContent = `読んだ文字数　${countTotalCharacters(currentNovel)}`
            row.appendChild(cell)

            // table -> tbody -> insert before the first tr
            table.children[0].insertBefore(row, table.children[0].children[0])

            // list the characters on each tracked chapter item
            for (const [key, row] of Array.from(table.children[0].children).entries()) {
                if (currentNovel.readChapters[key]) {
                    const counterText = document.createElement("span")
                    counterText.textContent += `（${currentNovel.readChapters[key].characters}）`
                    row.children[0].appendChild(counterText)

                    // make a remove button
                    const btn = document.createElement("button")
                    btn.textContent = "削除";
                    btn.onclick = () => {
                        const { [key]: _, ...updatedChapters } = currentNovel.readChapters;
                        const id = paths[2]
                        currentNovel.readChapters = updatedChapters;
                        console.log(updatedChapters)
                        console.log(currentNovel)
                        localStorage.setItem(id, JSON.stringify(currentNovel))
                        window.location.reload()
                    }

                    row.children[0].appendChild(btn);
                }
            }

            return;
        }

        // if we're in a chapter, render the counter
        if (currentChapter) {
            // get the chapter by finding via id
            const id = currentChapter.split(".")[0]
            const chapter = currentNovel.readChapters[id]
            document.querySelectorAll('span[style="font-size:120%"]')[1].innerHTML = `${chapter.title}（${chapter.characters}）`
            return;
        }
    }

    main();
})();