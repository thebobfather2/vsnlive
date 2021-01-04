const multiviewConfig = {
  "grid": {
    "columns": "3",
    "rows": "3"
  },
  "streams": [
    { "title": "Main",
      "feedOption": 0,
      "gridArea": "1 / 1 / span 2 / span 2"
    },
    { "title": "Side",
      "feedOption": 1,
      "gridArea": "3 / 1 / span 1 / span 1"
    },
    { "title": "Sky View",
      "feedOption": 2,
      "gridArea": "3 / 2 / span 1 / span 1"
    },
    { "title": "Audience",
      "feedOption": 3,
      "gridArea": "3 / 3 / span 1 / span 1"
    },
    { "title": "Artist",
      "feedOption": 4,
      "gridArea": "2 / 3 / span 1 / span 1"
    },
    { "title": "Zoom",
      "feedOption": 5,
      "gridArea": "1 / 3 / span 1 / span 1"
    }
 ]
};

export { multiviewConfig };