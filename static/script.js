document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('gene-input').addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); 
            document.getElementById('submit-button').click(); 
        }
    });

    const viewer1 = OpenSeadragon({
        id: "viewer1",
        prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/3.0.0/images/",
        tileSources: "/static/openseasdra/db1/sp1/db1_sp1.dzi"
    });

    const viewer2 = OpenSeadragon({
        id: "viewer2",
        prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/3.0.0/images/",
        tileSources: "/static/openseasdra/db1/sp2/db1_sp2.dzi"
    });

    let currentDataset = 'database1'; 

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active-tab'));
            this.classList.add('active-tab');
            currentDataset = this.dataset.dataset;
            updateViewersForDataset(currentDataset);
            if (lastGene) fetchAndPlotGene(lastGene);
        });
    });

    function updateViewersForDataset(dataset) {
        let base = "/static/openseasdra";
        if (dataset === 'db1') {
            viewer1.open(`${base}/db1/sp1/db1_sp1.dzi`);
            viewer2.open(`${base}/db1/sp2/db1_sp2.dzi`);
        } else if (dataset === 'db2') {
            viewer1.open(`${base}/db2/sp1/db2_sp1.dzi`);
            viewer2.open(`${base}/db2/sp2/db2_sp2.dzi`);
        } else if (dataset === 'db3') {
            viewer1.open(`${base}/db3/sp1/db3_sp1.dzi`);
            viewer2.open(`${base}/db3/sp2/db3_sp2.dzi`);
        } else if (dataset === 'db4') {
            viewer1.open(`${base}/db4/sp1/db4_sp1.dzi`);
            viewer2.open(`${base}/db4/sp2/db4_sp2.dzi`);
        }
    }

    function getCollectionNames(dataset) {
        if (dataset === 'database1') return ['db1_sp1', 'db1_sp2'];
        if (dataset === 'database2') return ['db2_sp1', 'db2_sp2'];
        if (dataset === 'database3') return ['db3_sp1', 'db3_sp2'];
        if (dataset === 'database4') return ['db4_sp1', 'db4_sp2'];
        return ['db1_sp1', 'db1_sp2']; // default
    }

    function fetchAndPlotGene(gene) {
        clearGenePoints1();
        clearGenePoints2();

        const [collection1, collection2] = getCollectionNames(currentDataset);
        const timestamp1 = new Date().getTime();
        const timestamp2 = new Date().getTime();

        fetch(`/get_gene_expression?gene=${gene}&db=database&collection=${collection1}&_=${timestamp1}`)
            .then(res => res.json())
            .then(data => {
                if (data.length > 0) {
                    const formatted = restructureData(data);
                    plotGeneExpression1(formatted);
                }
            });

        fetch(`/get_gene_expression?gene=${gene}&db=database&collection=${collection2}&_=${timestamp2}`)
            .then(res => res.json())
            .then(data => {
                if (data.length > 0) {
                    const formatted = restructureData(data);
                    plotGeneExpression2(formatted);
                }
            });
    }

    let isSyncing = false;
    let genePoints1 = [];
    let genePoints2 = [];

    function synchronizeViewers(sourceViewer, targetViewer) {
        if (isSyncing) return;
        isSyncing = true;
        
        const center = sourceViewer.viewport.getCenter();
        const zoom = sourceViewer.viewport.getZoom();
        targetViewer.viewport.zoomTo(zoom);
        targetViewer.viewport.panTo(center);

        isSyncing = false;
    }
    

    viewer1.addHandler('zoom', function() {
        synchronizeViewers(viewer1, viewer2);
    });

    viewer1.addHandler('pan', function() {
        synchronizeViewers(viewer1, viewer2);
    });

    viewer2.addHandler('zoom', function() {
        synchronizeViewers(viewer2, viewer1);
    });

    viewer2.addHandler('pan', function() {
        synchronizeViewers(viewer2, viewer1);
    });

    viewer1.addHandler('full-page', function(evt) {
        if (!evt.fullPage) { 
            viewer1.forceResize();   
            viewer2.forceResize();   
            viewer1.forceRedraw();
            viewer2.forceRedraw();
            const center = viewer1.viewport.getCenter();
            const zoom   = viewer1.viewport.getZoom();
            viewer2.viewport.panTo(center);
            viewer2.viewport.zoomTo(zoom);
        }
    });

    viewer2.addHandler('full-page', function(evt) {
        if (!evt.fullPage) { 
            viewer1.forceResize();   
            viewer2.forceResize();   
            viewer1.forceRedraw();  
            viewer2.forceRedraw();
            const center = viewer2.viewport.getCenter();
            const zoom   = viewer2.viewport.getZoom();
            viewer1.viewport.panTo(center);
            viewer1.viewport.zoomTo(zoom);
        }
    });


    function clearGenePoints1() {
        genePoints1.forEach(point => point.element.remove());
        genePoints1 = [];
    }

    function clearGenePoints2() {
        genePoints2.forEach(point => point.element.remove());
        genePoints2 = [];
    }

    function getSelectedGradientColor(value, min, max) {
        const selectedColor = document.getElementById('color-select').value;
        
        if (selectedColor === 'cyan') {
            return getCyanGradientColor(value, min, max);
        } else if (selectedColor === 'yellow') {
            return getYellowGradientColor(value, min, max);
        } else if (selectedColor === 'green') {
            return getGreenGradientColor(value, min, max);
        }
    }

    function getCyanGradientColor(value, min, max) {
        const ratio = (value - min) / (max - min);
        const g = Math.floor(255 * ratio);
        return `rgb(0, ${g}, 255)`;
    }

    function getYellowGradientColor(value, min, max) {
        const ratio = (value - min) / (max - min);
        const r = Math.floor(255 * ratio);
        return `rgb(${r}, ${r}, 0)`;
    }

    function getGreenGradientColor(value, min, max) {
        const ratio = (value - min) / (max - min);
        const g = Math.floor(255 * ratio);
        return `rgb(0, ${g}, 0)`;
    }

    const MAX_POINTS = 125000;
    function getRandomSample(arr, n) {
         const result = [];
         const taken = new Set();
         while (result.length < n && result.length < arr.length) {
             const i = Math.floor(Math.random() * arr.length);
             if (!taken.has(i)) {
                 result.push(arr[i]);
                 taken.add(i);
             }
         }
         return result;
     }
    function plotGeneExpression1(data) {
        clearGenePoints1();
        if (data.length > MAX_POINTS) {
            console.warn(`Randomly sampling ${MAX_POINTS} of ${data.length} total points`);
            data = getRandomSample(data, MAX_POINTS);
        }
        const expressionValues = data.map(d => d.expr);
        const minExpr = Math.min(...expressionValues);
        const maxExpr = Math.max(...expressionValues);

        data.forEach(point => {
            const color = getSelectedGradientColor(point.expr, minExpr, maxExpr);  
            const element = document.createElement('div');
            element.className = 'gene-point';
            element.style.backgroundColor = color;

            document.getElementById(viewer1.id).appendChild(element);
            genePoints1.push({element, x: point.y, y: point.x});
        });

        updateGenePoints1();  
    }

    function updateGenePoints1() {
        const viewport = viewer1.viewport;
        const currentZoom = viewport.getZoom(true);
        const minZoom = viewer1.viewport.getMinZoom();
        const maxZoom = viewer1.viewport.getMaxZoom();

        const pointSize = getPointSizeForZoom(currentZoom, minZoom, maxZoom);

        const viewerElement = document.getElementById(viewer1.id);
        const viewerWidth = viewerElement.offsetWidth;
        const viewerHeight = viewerElement.offsetHeight;

        genePoints1.forEach(({element, x, y}) => {
            const imagePoint = new OpenSeadragon.Point(x, y);
            const viewportPoint = viewer1.viewport.imageToViewportCoordinates(imagePoint);
            const screenPoint = viewer1.viewport.pixelFromPoint(viewportPoint, true);

            if (screenPoint.x >= 0 && screenPoint.x <= viewerWidth && screenPoint.y >= 0 && screenPoint.y <= viewerHeight) {
                element.style.display = 'block'; 
                element.style.left = `${screenPoint.x}px`;
                element.style.top = `${screenPoint.y}px`;
                element.style.width = `${pointSize}px`;
                element.style.height = `${pointSize}px`;
            } else {
                element.style.display = 'none'; 
            }
        });
    }


    function plotGeneExpression2(data) {
        clearGenePoints2();
        if (data.length > MAX_POINTS) {
            console.warn(`Randomly sampling ${MAX_POINTS} of ${data.length} total points`);
            data = getRandomSample(data, MAX_POINTS);
        }
        const expressionValues = data.map(d => d.expr);
        const minExpr = Math.min(...expressionValues);
        const maxExpr = Math.max(...expressionValues);

        data.forEach(point => {
            const color = getSelectedGradientColor(point.expr, minExpr, maxExpr);  
            const element = document.createElement('div');
            element.className = 'gene-point';
            element.style.backgroundColor = color;

            document.getElementById(viewer2.id).appendChild(element);
            genePoints2.push({element, x: point.y, y: point.x});
        });

        updateGenePoints2(); 
    }


    function updateGenePoints2() {
        const viewport = viewer2.viewport;
        const currentZoom = viewport.getZoom(true);
        const minZoom = viewer2.viewport.getMinZoom();
        const maxZoom = viewer2.viewport.getMaxZoom();

        const pointSize = getPointSizeForZoom(currentZoom, minZoom, maxZoom);

        const viewerElement = document.getElementById(viewer2.id);
        const viewerWidth = viewerElement.offsetWidth;
        const viewerHeight = viewerElement.offsetHeight;

        genePoints2.forEach(({element, x, y}) => {
            const imagePoint = new OpenSeadragon.Point(x, y);
            const viewportPoint = viewer2.viewport.imageToViewportCoordinates(imagePoint);
            const screenPoint = viewer2.viewport.pixelFromPoint(viewportPoint, true);

            if (screenPoint.x >= 0 && screenPoint.x <= viewerWidth && screenPoint.y >= 0 && screenPoint.y <= viewerHeight) {
                element.style.display = 'block';
                element.style.left = `${screenPoint.x}px`;
                element.style.top = `${screenPoint.y}px`;
                element.style.width = `${pointSize}px`;
                element.style.height = `${pointSize}px`;
            } else {
                element.style.display = 'none'; 
            }
        });
    }


    function getPointSizeForZoom(zoomLevel, minZoom, maxZoom) {
        const zoomRange = maxZoom - minZoom;
        const relativeZoom = (zoomLevel - minZoom) / zoomRange;

        if (relativeZoom < 0.05) return 1;
        else if (relativeZoom < 0.08) return 2;
        else if (relativeZoom < 0.1) return 3;
        else if (relativeZoom < 0.2) return 5;
        else if (relativeZoom < 0.3) return 7;
        else if (relativeZoom < 0.4) return 9;
        else if (relativeZoom < 0.5) return 11;
        else if (relativeZoom < 0.6) return 13;
        else if (relativeZoom < 0.7) return 15;
        else if (relativeZoom < 0.8) return 17;
        else if (relativeZoom < 0.9) return 19;
        else return 21;
    }

    viewer1.addHandler('animation', updateGenePoints1);
    viewer2.addHandler('animation', updateGenePoints2);

    function standardizeGeneName(gene) {
        if (!gene) return '';
        return gene.charAt(0).toUpperCase() + gene.slice(1).toLowerCase();
    }

    function restructureData(data) {
        const xArray = data[0].x;
        const yArray = data[0].y;
        const exprArray = data[0].expr;
        const formattedData = [];

        for (let i = 0; i < xArray.length; i++) {
            formattedData.push({
                x: xArray[i],
                y: yArray[i],
                expr: exprArray[i]
            });
        }
        return formattedData;
    }

    let lastGene = null;
    document.getElementById('submit-button').addEventListener('click', () => {
        const geneInput = document.getElementById('gene-input').value.trim();
        const standardizedGene = standardizeGeneName(geneInput);
        if (standardizedGene) {
            lastGene = standardizedGene;
            fetchAndPlotGene(standardizedGene);
        }

        fetch('/get_gene_info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ gene_input: geneInput })
        })
        .then(response => response.json())
        .then(data => {
            const formattedResponse = marked(data.response);
            document.getElementById('chatbot-response').innerHTML = formattedResponse;
        });
    });

    document.getElementById('color-select').addEventListener('change', function () {
        if (lastGene) {
            fetchAndPlotGene(lastGene);
        }
    });

});




