import { Deck, buildDefaultDeck } from "./Deck.js";
import { dispatchWithRedirect } from "./Dispatch.js";

function getLoggedInStatus() {
    const cookies = document.cookie.split(";");

    let isLoggedInCookie;
    if (cookies) isLoggedInCookie = cookies.filter(cookie => cookie.trim().startsWith("isLoggedIn="))[0];
    
    let isLoggedIn;
    if (isLoggedInCookie) isLoggedIn = isLoggedInCookie.split('=')[1] === "true";

    return isLoggedIn;
}

function reset() {
    const defaultDeck = buildDefaultDeck();
    localStorage.setItem("activeTags", JSON.stringify({ "basic hiragana": true }));
    localStorage.setItem("savedDeck", JSON.stringify(defaultDeck));
    return defaultDeck;
}

async function loadRemote() {
    let data;
    try {
        const res = await dispatchWithRedirect("/api/get-deck", "POST", {});

        if (res && res.body && res.body.data)
            data = Deck.buildFromJSON(res.body.data);

        if (res && res.error)
            throw Error(res.error);
    } catch (err) {
        throw (err);
    }
    return data;
}

function loadLocal() {
    // Load existing settings if they're there.
    // Only time not there is if we haven't built default yet (first visit).
    const savedSettings = JSON.parse(localStorage.getItem("activeTags"));
    
    const startingActive = [];
    if (savedSettings) {
        Object.entries(savedSettings).forEach(([tag, active]) => {
            if (active)
                startingActive.push(tag);
        });
    }

    // Load existing deck if it's there.
    const savedDeckJSON = localStorage.getItem("savedDeck");

    let deck;
    if (savedDeckJSON) {
        deck = Deck.buildFromJSON(savedDeckJSON);
        deck.rebuildActive(startingActive);
    }
    
    return deck;
}

async function load() {
    const isLoggedIn = getLoggedInStatus();
    const response = { source: undefined, data: undefined, remoteFailed: false, isLoggedIn };

    // Should try to pull from server if the user is logged in.
    if (isLoggedIn) {
        try {
            response.data = await loadRemote();
            response.source = "remote";
            if (!response.data)
                throw Error("Failed to load data from remote.");
            saveLocally(response.data);
        } catch (err) {
            console.log(err);
            response.remoteFailed = true;
        }
    }
    
    // If not logged in or we somehow failed to pull from server,
    // just load what's already stored locally
    if (!isLoggedIn || response.remoteFailed) {
        response.data = loadLocal();
        response.source = "local";
    }
    
    // If we fail to locate a locally stored deck, load the default deck.
    if (!response.data) {
        response.data = reset();
        response.source = "default";
    }

    return response;
}

function saveLocally(data) {
    localStorage.setItem("savedDeck", JSON.stringify(data));
}

async function save(data) {
    const isLoggedIn = getLoggedInStatus();
    const response = { destination: undefined, remoteFailed: false, isLoggedIn };

    if (isLoggedIn) {
        try {
            const res = await dispatchWithRedirect("/api/update-deck", "POST", { data });
            if (res && res.body && res.body.error)
                throw Error(res.body.error + " " + res.body.message);
            
            if (res && res.response && res.response.status >= 300)
                throw Error("Failed to save data to remote.");
            
            response.destination = "remote";
        } catch (err) {
            console.log(err);
            response.remoteFailed = true;
        }
    }

    // Always save locally.
    saveLocally(data);

    return response;
}

const DeckController = {
    save,
    load,
    reset
}

export default DeckController;