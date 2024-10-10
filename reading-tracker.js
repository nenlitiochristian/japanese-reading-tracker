// ==UserScript==
// @name         Japanese Reading Tracker
// @description  Keeps track of characters read in popular japanese websites like syosetu.com, etc.
// @version      1.1
// @author       nenlitiochristian
// @match        https://syosetu.org/*
// @match        https://kakuyomu.jp/*
// ==/UserScript==

(function () {
    'use strict';
    // credit to cademcniven for this
    function countJapaneseCharacters(japaneseText) {
        const regex = /[一-龠]+|[ぁ-ゔ]+|[ァ-ヴー]+|[ａ-ｚＡ-Ｚ０-９]+|[々〆〤ヶ]+/g
        return [...japaneseText.matchAll(regex)].join('').length
    }

    /**
     * @typedef {Object} Chapter
     * @property {string} title - The title of the chapter.
     * @property {number} characters - The number of characters read in the chapter.
     */

    /**
     * @typedef {Object} Novel
     * @property {Object.<string, Chapter>} readChapters - A map where the key is the chapter ID and the value is a `Chapter` object.
     */

    /**
     * Makes a new empty novel
     * @returns {Novel} 
     */
    function newNovel() {
        return {
            readChapters: {},
        }
    }

    /**
     * @param {string} id - The unique identifier for the novel.
     */
    function initializeStorage(id) {
        localStorage.setItem(id, JSON.stringify(newNovel()));
    }

    /**
     * @param {Novel} novel
     * @returns {number}
     */
    function countTotalCharacters(novel) {
        let counter = 0;
        // Sum up the character count from all chapters
        Object.entries(novel.readChapters).forEach(([_, value]) => {
            counter += value.characters;
        });
        return counter;
    }

    /**
     * @returns {string}
     */
    function getHostname() {
        return window.location.hostname;
    }

    class SiteStrategy {
        isInNovelPage() {
            throw new Error("Method not implemented.");
        }
        getNovelId() {
            throw new Error("Method not implemented.");
        }
        handleOldNovel(id) {
            throw new Error("Method not implemented.");
        }

        /**
         * @param {string} id
         * @param {Novel} novelData 
         */
        renderCounter(id, novelData) {
            // Create a floating button
            const button = document.createElement('button');
            button.id = 'tracker-button';
            button.textContent = `読書記録を開く`;
            button.style.position = 'fixed';
            button.style.bottom = '20px';
            button.style.right = '20px';
            button.style.backgroundColor = '#333';
            button.style.color = '#fff';
            button.style.border = 'none';
            button.style.padding = '10px 20px';
            button.style.borderRadius = '5px';
            button.style.cursor = 'pointer';
            button.style.zIndex = '1000';
            button.style.boxShadow = '0px 0px 5px rgba(0,0,0,0.5)';

            document.body.appendChild(button);

            const overlayContainer = document.createElement('div');
            overlayContainer.style.position = "fixed";
            overlayContainer.style.left = "0px";
            overlayContainer.style.top = "0px";
            overlayContainer.style.width = "100%";
            overlayContainer.style.height = "100%";
            overlayContainer.style.justifyContent = "center";
            overlayContainer.style.display = "none";
            overlayContainer.style.alignItems = "center";
            overlayContainer.style.zIndex = "1001";
            overlayContainer.style.fontSize = "16px";
            overlayContainer.style.background = "rgba(0, 0, 0, 0.5)";

            const popup = document.createElement('div');
            popup.id = 'tracker-popup';
            popup.style.height = '90%';
            popup.style.width = 'calc(200px + 40%)';
            popup.style.backgroundColor = '#222';
            popup.style.color = '#fff';
            popup.style.padding = '20px';
            popup.style.borderRadius = '10px';
            popup.style.boxShadow = '0px 4px 10px rgba(0,0,0,0.5)';
            popup.style.display = "flex";
            popup.style.flexDirection = "column";

            // Add content to the popup
            const title = document.createElement('h2');
            title.textContent = `合計文字数：${countTotalCharacters(novelData)}`;
            title.style.borderBottom = '1px solid #444';
            title.style.paddingBottom = '10px';
            overlayContainer.appendChild(popup);
            popup.appendChild(title);

            // List of tracked chapters
            const chapterList = document.createElement('table');
            chapterList.style.paddingTop = "4px";
            chapterList.style.listStyle = 'none';
            chapterList.style.overflowY = "auto";
            chapterList.style.padding = '0';
            chapterList.style.marginBottom = "auto";

            const listHeader = document.createElement('thead');
            listHeader.innerHTML = `<tr>
                <th>#</td> <td>タイトル</td> <td>文字数</td> <td style="width:64px;"></td>
            </tr>`
            chapterList.append(listHeader);

            const listBody = document.createElement('tbody');
            chapterList.append(listBody);

            // kakuyomu doesn't start at 1, we make it so that it does
            let index = 1;
            // Populate the list with tracked chapters
            Object.entries(novelData.readChapters).sort((a, b) => parseInt(a) - parseInt(b)).forEach(([key, chapter]) => {
                const listItem = document.createElement('tr');
                listItem.innerHTML = `
            <td>${index}</td> <td>${chapter.title}</td> <td>${chapter.characters}</td>
            <td>
                <button data-chapter="${key}" style="background-color: #ff6347; color: #fff; border: none; padding: 5px; cursor: pointer; border-radius: 3px;">削除</button>
            </td>`;

                // Add event listener for the remove button
                listItem.querySelector('button').addEventListener('click', () => {
                    const { [key]: _, ...updatedChapters } = novelData.readChapters;
                    novelData.readChapters = updatedChapters;
                    localStorage.setItem(id, JSON.stringify(novelData)); // Update the novel data in localStorage
                    window.location.reload(); // Reload to update UI
                });

                chapterList.appendChild(listItem);
                index++;
            });

            popup.appendChild(chapterList);

            // Add close button
            const closeButton = document.createElement('button');
            closeButton.textContent = '閉じる';
            closeButton.style.backgroundColor = '#444';
            closeButton.style.color = '#fff';
            closeButton.style.border = 'none';
            closeButton.style.padding = '10px 20px';
            closeButton.style.borderRadius = '5px';
            closeButton.style.cursor = 'pointer';
            closeButton.style.marginTop = '20px';
            closeButton.style.width = "fit-content";

            closeButton.addEventListener('click', () => {
                overlayContainer.style.display = 'none';
            });

            popup.appendChild(closeButton);

            // Add popup to the body
            document.body.appendChild(overlayContainer);

            // Toggle popup visibility on button click
            button.addEventListener('click', () => {
                overlayContainer.style.display = overlayContainer.style.display === 'none' ? 'flex' : 'none';
            });
        }

    }

    class SyosetuOrg extends SiteStrategy {
        // https://syosetu.org/novel/{id}/{chapter}.html
        // split by "/"
        // 1 -> gets "novel"
        // 2 -> gets {id}
        // 3 -> gets {chapter}
        isInNovelPage() {
            return window.location.pathname.split("/")[1] === "novel";
        }

        getNovelId() {
            return window.location.pathname.split("/")[2];
        }

        handleOldNovel(id) {
            // get the current chapter from the URL (if any)
            let chapterId = window.location.pathname.split("/")[3];
            const currentNovelData = JSON.parse(localStorage.getItem(id));

            // if we are not in a chapter page, just return the existing novel data
            if (!chapterId) {
                return currentNovelData;
            }

            // syosetu.org has .html attached to the number, we remove it
            chapterId = chapterId.split(".")[0];

            // Get the chapter content and calculate the character count
            const chapterContent = document.querySelector("#honbun");
            const chapterText = [...chapterContent.childNodes].map((node) => node.textContent).join("");

            // Create a new chapter entry
            // syosetu.org has 2 utterly different html pages for desktop and mobile
            const titles = document.querySelectorAll('span[style="font-size:120%"]')
            let newChapter = {};

            // if desktop
            if (titles.length === 2) {
                newChapter.title = titles[1].textContent ?? "Unknown"
                newChapter.characters = countJapaneseCharacters(chapterText)
            }
            // if mobile
            else {
                newChapter.title = document.querySelector("h2").textContent ?? "Unknown"
                newChapter.characters = countJapaneseCharacters(chapterText)
            }

            // Update the novel data with the new chapter and store it in localStorage
            currentNovelData.readChapters = { ...currentNovelData.readChapters, [chapterId]: newChapter };
            localStorage.setItem(id, JSON.stringify(currentNovelData));

            return currentNovelData;
        }
    }


    class KakuyomuJp extends SiteStrategy {
        // https://kakuyomu.jp/works/{novel}/episodes/{chapter}
        // split by /
        // 1 -> works
        // 2 -> {novel}
        // 4 -> {chapter}
        isInNovelPage() {
            return window.location.pathname.split("/")[1] === "works";
        }

        getNovelId() {
            return window.location.pathname.split("/")[2];
        }

        handleOldNovel(id) {
            // get the current chapter from the URL (if any)
            let chapterId = window.location.pathname.split("/")[4];
            const currentNovelData = JSON.parse(localStorage.getItem(id));

            // if we are not in a chapter page, just return the existing novel data
            if (!chapterId) {
                return currentNovelData;
            }

            // Get the chapter content and calculate the character count
            const chapterContent = document.querySelector(".widget-episodeBody");
            const chapterText = [...chapterContent.childNodes].map((node) => node.textContent).join("");

            const newChapter = {
                title: document.querySelector(".widget-episodeTitle").textContent,
                characters: countJapaneseCharacters(chapterText),
            }

            // Update the novel data with the new chapter and store it in localStorage
            currentNovelData.readChapters = { ...currentNovelData.readChapters, [chapterId]: newChapter };
            localStorage.setItem(id, JSON.stringify(currentNovelData));

            return currentNovelData;
        }
    }

    class SyosetuCom extends SiteStrategy {

    }

    /**
     * @param {string} hostname 
     * @returns {SiteStrategy}
     */
    function getHandlerByHost(hostname) {
        if (hostname === "syosetu.org") {
            return new SyosetuOrg();
        }
        else if (hostname === "syosetu.com") {
            return new SyosetuCom();
        }
        else if (hostname === "kakuyomu.jp") {
            return new KakuyomuJp();
        }
        throw new Error("Site not supported!");
    }

    function main() {
        const hostname = getHostname();
        const handler = getHandlerByHost(hostname);

        // if we're not currently in a novel-related page where we can get the id, we do nothing
        // i.e in home page or settings, etc
        if (!handler.isInNovelPage()) {
            return;
        }

        const novelId = handler.getNovelId();
        if (localStorage.getItem(novelId) === null) {
            initializeStorage(novelId);
        }

        const currentNovel = handler.handleOldNovel(novelId);
        handler.renderCounter(novelId, currentNovel);
    }

    main();
})();