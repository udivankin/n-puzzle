var puzzle = (function() {

    'use strict';

    var puzzleModule = function(options) {

        var storageKey = 'puzzle_' + options.cols + '_' + options.rows;
        var complete = false;
        var marginSize = 8;

        var tiles = {
            registry: [],
            initialRegistry: [],
            emptyPos: {}
        };

        function arrayShuffle(o){
            for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
            return o;
        };

        function getSiblings(pos) { // TODO refactor
            var a = [];
            [ {x: pos.x - 1, y: pos.y}, {x: pos.x, y: pos.y - 1},
              {x: pos.x + 1, y: pos.y}, {x: pos.x, y: pos.y + 1}
            ].forEach(function (b) {
                if (b.x >= 0 || b.x < options.cols || b.y >= 0 || b.y < options.rows) {
                    a.push(b);
                }
            });
            return a;
        }

        function randomMove() {
            var targetTile = arrayShuffle(getSiblings(tiles.emptyPos))[0];
            tiles.registry.forEach(function (tile) {
                if (tile.x === targetTile.x && tile.y === targetTile.y) {
                    tile.move(true);
                }
            });
        }

        function checkComlete() {
            complete = JSON.stringify(tiles.registry) === JSON.stringify(tiles.initialRegistry);
            if (complete) {
                options.completeCallback();
            }
        }

        function Tile(tileData) {
            this.x = tileData.x; // координаты по х, 0 слева
            this.y = tileData.y; // координаты по y, 0 сверху
            this.number = tileData.hasOwnProperty('number') ? tileData.number : tileData.y * options.cols + tileData.x + 1; // номер на плитке
        }

        Tile.prototype.move = function (isShuffling, callback) {
            getSiblings(this).forEach(function (where) { // проверка на empty и обмен координатами
                if (tiles.emptyPos.x === where.x && tiles.emptyPos.y === where.y) {
                    tiles.emptyPos = {x: this.x, y: this.y};
                    this.x = where.x;
                    this.y = where.y;
                }
            }, this);
            if (!isShuffling) {
                saveLayout();
                callback();
                checkComlete();
            }
        };

        function DomTile(tile, animate) {
            var tileElement = document.createElement('div');
            // копию плитки в Dom элемент TODO
            tileElement.tile = tile;
            // устанавливаем класс заранее - необходимо для css анимации
            tileElement.className = 'puzzle-tile';
            // так как поле паззла произвольного размера, стили задаем в рантайме
            tileElement.setTileStyles = function () {
                tileElement.style.margin = marginSize / options.rows + '%';
                tileElement.style.width = (100 - marginSize) / options.cols + '%';
                tileElement.style.height = (100 - marginSize) / options.rows + '%';
                tileElement.style.lineHeight = options.gameContainer.offsetHeight * (1 - marginSize/100) / options.rows + 'px';
                tileElement.style.fontSize = options.gameContainer.offsetHeight * (1 - marginSize/100) / options.rows / 2 + 'px';
                if (animate) { // текст после завершения анимации
                    setTimeout(function () {
                        tileElement.textContent = tileElement.tile.number;
                    }, 100);
                } else {
                    tileElement.textContent = tileElement.tile.number;
                }
            };
            // позицию необходимо будет менять, сообщая tile в качестве параметра
            tileElement.setTilePos = function (moveTo) {
                tileElement.style.left = 100 * moveTo.x / options.cols + '%';
                tileElement.style.top = 100 * moveTo.y / options.rows + '%';
            };
            tileElement.setTilePos(tile);
            if (animate) { // анимация при первичной прорисовке
                setTimeout(tileElement.setTileStyles, 50 * (tile.x + tile.y));
            } else {
                tileElement.setTileStyles();
            }
            // передвигает плитку ссылка на которую была передана в параметре
            tileElement.move  = function () {
                tileElement.classList.add('moving');
                tileElement.setTilePos(tile);
                setTimeout(function() {
                    tileElement.classList.remove('moving');
                }, 130);
            };
            // onClick handler
            tileElement.onclick = function () {
                tile.move(false, tileElement.move);
            };
            return tileElement;
        }

        // создаем плитки победного расклада
        function generateTiles() {
            var a = [];
            for (var x = 0; x < options.cols; x++) {
                for (var y = 0; y < options.rows; y++) {
                    if (x * y === (options.cols - 1) * (options.rows - 1)) { // skip last item
                        tiles.emptyPos = {x: x, y: y};
                        continue;
                    }
                    a.push(new Tile({x: x, y: y}));
                }
            }
            return a;
        }

        // TODO инициализируем игровую комбинацию
        function shuffle() {
            for (var i = 0; i < Math.pow(options.rows * options.cols, 2); i++) {
                randomMove();
            }
        }

        // создаем DOM элементы на основе массива плиток
        function render(animate) {
            tiles.registry.forEach(function(tile) {
                options.gameContainer.appendChild(new DomTile(tile, animate));
            });
        }

        // перегенерируем из сохраненной игры
        function loadLayout() {
            var data = JSON.parse(localStorage.getItem(storageKey));
            data.tiles.forEach(function(savedTile) {
                tiles.registry.push(new Tile(savedTile));
            });
            tiles.emptyPos = data.emptyPos;
        }

        // сохраняем игру
        function saveLayout() {
            localStorage.setItem(storageKey, JSON.stringify({tiles: tiles.registry, emptyPos: tiles.emptyPos}));
        }

        // подстраиваем высоту контейнера, чтобы плитки оставались квадратными
        function adjustContainer() {
            var w, h;
            var largerSize = 100 - marginSize * 4;
            var screenFactor = window.innerWidth / window.innerHeight;
            var puzzleFactor = options.cols / options.rows;
            var footerHeight = document.getElementsByTagName('footer')[0].offsetHeight / window.innerHeight * 100;
            
            // нам нужна доска которая не выше (или не шире) чем эквивалент n% меньшей стороны
            if (screenFactor > puzzleFactor) { 
                h = largerSize;
                w = h * puzzleFactor / screenFactor;
            } else {
                w = largerSize; // 60 and 1.25
                h = w / puzzleFactor * screenFactor;
            }
            
            options.gameContainer.style.width = w + '%';
            options.gameContainer.style.height = h + '%';
            options.gameContainer.style.marginLeft = '-' + w / 2 + '%';
            options.gameContainer.style.top = (100 - footerHeight - h) / 2 + '%';
                
            clearDom();
            render(false);
        }

        // сбрасываем DOM контейнера
        function clearDom() {
            while (options.gameContainer.firstChild) {
                options.gameContainer.removeChild(options.gameContainer.firstChild);
            }
        }

        function reset() {
            localStorage.removeItem(storageKey); // сбрасываем localStorage
            clearDom();
            complete = false;
            tiles.initialRegistry = [] // сбрасываем собранный расклад
            tiles.registry = []; // сбрасываем текуший расклад
            init();
        }

        function init() {
            tiles.initialRegistry = generateTiles();
            adjustContainer();
            if (localStorage.getItem(storageKey)) { // проверяем сохраненную игру
                loadLayout();
            } else {
                tiles.registry =  generateTiles();
                shuffle();
            }
            render(true);
        }

        this.onResize = function() {
            adjustContainer();
        };

        this.onReset = function() {
            reset();
        };

        this.isComplete = function() {
            return complete;
        };

        init();
    };

    return puzzleModule;

}());

window.addEventListener(
    'load',
    function() {

        var boardSize = localStorage.getItem('puzzle-size') ? JSON.parse(localStorage.getItem('puzzle-size')) : {rows: 4, cols: 4};

        function hideComplete() {
            document.getElementById('congrats').style.display = 'none';
            document.getElementById('main').classList.remove('resizing');
            document.getElementById('sfx-win').pause();
            document.getElementById('sfx-win').load();
        }

        function onComplete() {
            document.getElementById('main').classList.add('resizing');
            document.getElementById('congrats').style.display = 'block';
            document.getElementById('sfx-win').play();
        }

        function initPuzzle(boardSize) {

            var resizeTimer;

            var MyPuzzle = new puzzle({
                rows: boardSize.rows,
                cols: boardSize.cols,
                gameContainer: document.getElementById('puzzle-container'),
                completeCallback: onComplete
            });
            document.title = (boardSize.rows * boardSize.cols - 1) + ' puzzle'; // релевантный заголовок :)

            document.getElementById('btn-shuffle').onclick = function() {
                hideComplete();
                MyPuzzle.onReset();
            };

            function resizeEnd(){
                if (!MyPuzzle.isComplete()) {
                    document.getElementById('main').classList.remove('resizing');
                    MyPuzzle.onResize();
                }
            }

            window.onresize = function(){ // resize timer
              document.getElementById('main').classList.add('resizing');
              clearTimeout(resizeTimer);
              resizeTimer = setTimeout(resizeEnd, 600);
            };

        }

        initPuzzle(boardSize);

        controls = document.getElementById('size-controls').getElementsByTagName('span');
        for (var i = 0; i < controls.length; i++) {
            controls[i].onclick = function() {
                hideComplete();
                if (this.dataset.dec) {
                    if (boardSize[this.dataset.var] > 2) {
                        boardSize[this.dataset.var]--;
                        initPuzzle(boardSize);
                    }
                } else if (this.dataset.inc)  {
                    if (boardSize[this.dataset.var] < 10) {
                        boardSize[this.dataset.var]++;
                        initPuzzle(boardSize);
                    }
                }
                localStorage.setItem('puzzle-size', JSON.stringify(boardSize));
            };
        }

    }
);