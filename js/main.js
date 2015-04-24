(function() {

    'use strict';

    function Puzzle(rows, cols) {

        var gameContainer = document.getElementById('puzzle-container');
        var tilesCount = rows * cols - 1;
        var storageKey = 'puzzle_' + cols + '_' + rows;

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
                if (b.x >= 0 || b.x < cols || b.y >= 0 || b.y < rows) {
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

        function Tile(tileData) {
            this.x = tileData.x; // координаты по х, 0 слева
            this.y = tileData.y; // координаты по y, 0 сверху
            this.number = tileData.hasOwnProperty('number') ? tileData.number : tileData.y * cols + tileData.x + 1; // номер на плитке
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
            }
        };

        function DomTile(tile, animate) {
            var tileElement = document.createElement('div');
            // копию плитки в Dom элемент TODO
            tileElement.tile = tile;
            // устанавливаем класс заранее - необходимо для css анимации
            tileElement.className = 'puzzle-tile'
            // так как поле паззла произвольного размера, стили задаем в рантайме
            tileElement.setTileStyles = function () {
                tileElement.style.margin = 8 / rows + '%';
                tileElement.style.width = 92 / cols + '%';
                tileElement.style.height = 92 / rows + '%';
                tileElement.style.lineHeight = gameContainer.clientHeight * 0.92 / rows + 'px';
                tileElement.style.fontSize = gameContainer.clientHeight * 0.92 / rows / 2 + 'px';
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
                tileElement.style.left = 100 * moveTo.x / cols + '%';
                tileElement.style.top = 100 * moveTo.y / rows + '%';
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
            tiles.initialRegistry = [];
            for (var x = 0; x < cols; x++) {
                for (var y = 0; y < rows; y++) {
                    if (x * y === (cols - 1) * (rows - 1)) { // skip last item
                        tiles.emptyPos = {x: x, y: y};
                        continue;
                    }
                    tiles.initialRegistry.push(new Tile({x: x, y: y}));
                }
            }
        }
        
        // TODO инициализируем игровую комбинацию
        function shuffle() {
            for (var i = 0; i < Math.pow(tilesCount, 2); i++) {
                randomMove();
            }
        }

        // создаем DOM элементы на основе массива плиток
        function render(animate) {
            tiles.registry.forEach(function(tile) {
                gameContainer.appendChild(new DomTile(tile, animate));
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
        function adjustWidth() {
            gameContainer.style.width = gameContainer.clientHeight / rows * cols + 'px';
            clearDom();
            render(false);
        }
        
        // сбрасываем DOM контейнера
        function clearDom() {
            while (gameContainer.firstChild) {
                gameContainer.removeChild(gameContainer.firstChild);
            }
        }

        function reset() {
            localStorage.removeItem(storageKey); // сбрасываем localStorage
            clearDom();
            tiles.registry = []; // сбрасываем текуший расклад
            init();
        }

        function init() {
            document.title = tilesCount + ' puzzle'; // релевантный заголовок :)
            generateTiles();
            adjustWidth();
            if (localStorage.getItem(storageKey)) { // проверяем сохраненную игру
                loadLayout();
            } else {
                tiles.registry = tiles.initialRegistry;
                shuffle();
            }
            render(true);
        }

        this.onResize = function() {
            adjustWidth();
        };

        this.onReset = function () {
            reset();
        };
        
        init();
    }

    window.addEventListener(
        'load',
        function() {
            var resizeTimer;
            var MyPuzzle = new Puzzle(3, 3);
            document.getElementById('btn-shuffle').onclick = MyPuzzle.onReset;
            function resizeEnd(){
                if (!MyPuzzle.won) {
                    document.getElementById('main').classList.remove('resizing');
                    MyPuzzle.onResize();
                }
            }
            // resize timer
            window.onresize = function(){
              document.getElementById('main').classList.add('resizing');
              clearTimeout(resizeTimer);
              resizeTimer = setTimeout(resizeEnd, 1000);
            };
        }
    );

}());