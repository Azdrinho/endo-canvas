// ... existing imports ... (I will include the whole file context for the function replacement if needed, but since I am replacing a function, I need to match the file structure carefully or just replace the function body if I can match context. The tool requires full file content usually if it's not a patch. But the prompt instructions say: "ONLY return the xml in the above format... To update files, you must output the following XML... content: Full content of file_1". Okay, I must return the FULL content of the file.)

import { Employee, TemplateType, CanvasConfig, Orientation, Language, ProviderFormat } from '../types';
import { LOGO_CONTENT, LOGO_TECHNOLOGY, LOGO_STUDIO, LOGO_OMNI, LOGO_GATOR, LOGO_CONSULTING } from '../components/SalsaLogo';

// --- STYLES ---

const getFontStyles = () => `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@300;400;500;600;700;800;900&display=swap');
    
    /* Import Orkney Font */
    @import url(https://db.onlinewebfonts.com/c/1aab5ed24c6a9f95b69de27350a83559?family=Orkney);

    body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: transparent !important; }
    
    /* Use Orkney Font for all templates */
    .akira-font { 
      font-family: 'Orkney', sans-serif; 
      font-weight: 700; 
      text-transform: uppercase;
    }
    
    .mont-font { font-family: 'Orkney', sans-serif; font-weight: 400; }
    .mont-semibold { font-family: 'Orkney', sans-serif; font-weight: 700; }
    .mont-light { font-family: 'Orkney', sans-serif; font-weight: 300; }

    /* Utility for Grid Layout */
    .grid-container {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      width: 100%;
      padding: 20px;
      box-sizing: border-box;
    }
    
    .grid-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
    }
  </style>
`;

// --- ASSETS & HELPERS ---

const NOISE_PATTERN = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAA5OTkAAABMTExERERmZmYzMzMyMjIxMTE3CN0CAAAAB3RSTlMAs7Ozvp2dS001MQAAAAFiS0dEAIgFHUgAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfmBwQXDzB5N0O0AAAAhklEQVQ4y6XTwQ3CMAwF0DzjqFA2QAFlA6ZATd0gK0SErMADP0O/oxO4S8T77yT3luQc4x8c+8d66x57x3r2HnufffZe+5x97j73vvvcf+6/9z/7//3P/v//c/+//9///zf/P/+/99/77/33/nv/vf/ef++/99/77/33/nv/vf/ef++/99/77/33/nv/vf/ef++/99/77/33/nv/vf/ef++/99/77/33/nv/vf/ef++/99/77/33/nv/vf/ef++/99/77/33/vt9d29y2/4D/QAAAABJRU5ErkJggg==";

const SALSA_GATOR_SVG_CONTENT = `<g xmlns="http://www.w3.org/2000/svg" id="Salsa_Gator">
	<path id="SALSA_00000139993430431868764700000009637074990207579817_" class="st0" d="M420,210.6c-10.7,0-21.5-1.8-32.2-5.5   c-10.7-3.6-19-8.3-24.8-13.9l15-21c3.6,4.2,9.4,7.8,17.3,10.8c7.9,3,15.6,4.7,23.1,5c7.6,0.4,13.9-0.9,18.7-3.7   c4.8-2.8,7.2-6.7,7.2-11.6c0-5.1-2.4-9-7.1-11.9c-4.7-2.8-12-5.8-21.8-8.9c-4.6-1.5-7.6-2.5-9.3-3c-1.6-0.5-4.5-1.6-8.7-3.3   c-4.2-1.6-7.2-3-9-4.2c-1.8-1.2-4.2-2.8-7.2-4.9c-3-2.1-5.1-4.2-6.4-6.4c-1.3-2.2-2.5-4.8-3.5-7.9c-1.1-3.1-1.6-6.4-1.6-9.8   c0-12,5-22,15.2-29.9c10.1-7.9,22.4-11.9,37-11.9c8.9,0,18,1.4,27.2,4.2c9.2,2.8,16.9,6.4,23.1,10.8l-16.4,21   c-7.6-6.7-17.1-10.7-28.4-12c-6.7-0.7-12.9,0.2-18.4,2.9c-5.6,2.6-8.3,6.3-8.3,11.1c0,1.8,0.3,3.5,1,4.9c0.6,1.5,1.8,2.9,3.5,4.2   c1.7,1.4,3.2,2.5,4.4,3.3c1.2,0.8,3.3,1.8,6.4,2.9c3.1,1.1,5.4,1.9,6.8,2.3c1.5,0.5,4.1,1.3,7.9,2.6c6.9,2,12.3,3.8,16.2,5.5   c3.9,1.6,8.4,4,13.4,7.1c5,3.1,8.7,7,11.2,11.6c2.5,4.6,3.7,10.1,3.7,16.5c0,12.6-5.2,22.9-15.6,31   C448.9,206.5,435.8,210.6,420,210.6 M555.3,68.6c-24,0-42.3,7.7-54.9,23.2l20.7,18.8c8.6-10.9,19.5-16.4,32.8-16.4   c8.7,0,15.9,2.1,21.6,6.4c5.6,4.3,8.5,10.8,8.5,19.5v12.3l-22.7-3c-21.5-2.9-37.6-0.5-48.4,7.4c-10.8,7.8-16.2,18.5-16.2,31.9   c0,12.2,4,22.2,11.9,30c7.9,7.8,18,11.7,30.2,11.7c15.6,0,31.3-6.6,46.9-19.7l1.4,16.9h26.7v-85.7c0-17.3-5.5-30.5-16.5-39.7   C586.2,73.2,572.3,68.6,555.3,68.6 M527.5,167.2c0-14,12.8-19.1,38.5-15.3l18,2.7v12.3c-13.8,11.3-26.6,16.9-38.2,16.9   c-5.5,0-9.9-1.5-13.2-4.5C529.2,176.3,527.5,172.2,527.5,167.2 M699.4,210.6c14,0,24.8-4,32.5-12l-16.6-20.5   c-3.8,4.4-8.8,6.6-15,6.6c-11.8,0-17.7-6.8-17.7-20.5l-0.3-161h-30.3v161c0,13.8,4.3,25,12.8,33.6   C673.3,206.3,684.9,210.6,699.4,210.6 M793.1,210.6c15.8,0,28.9-4,39.3-12.1c10.4-8.1,15.6-18.4,15.6-31c0-6.4-1.2-11.9-3.7-16.5   c-2.5-4.6-6.2-8.5-11.2-11.6c-5-3.1-9.5-5.5-13.4-7.1c-3.9-1.6-9.3-3.5-16.2-5.5c-3.8-1.3-6.5-2.1-7.9-2.6   c-1.5-0.5-3.7-1.2-6.8-2.3c-3.1-1.1-5.2-2-6.4-2.9c-1.2-0.8-2.6-1.9-4.4-3.3c-1.7-1.4-2.9-2.8-3.5-4.2c-0.6-1.5-1-3.1-1-4.9   c0-4.7,2.8-8.4,8.3-11.1c5.5-2.6,11.7-3.6,18.4-2.9c11.3,1.3,20.7,5.3,28.4,12l16.4-21c-6.2-4.4-13.9-8-23.1-10.8   c-9.2-2.8-18.2-4.2-27.2-4.2c-14.6,0-26.9,4-37,11.9c-10.1,7.9-15.2,17.9-15.2,29.9c0,3.5,0.5,6.7,1.6,9.8c1.1,3.1,2.3,5.7,3.5,7.9   c1.3,2.2,3.4,4.3,6.4,6.4c3,2.1,5.4,3.7,7.2,4.9c1.8,1.2,4.8,2.6,9,4.2c4.2,1.6,7.1,2.7,8.7,3.3c1.6,0.5,4.7,1.5,9.3,3   c9.8,3.1,17.1,6.1,21.8,8.9c4.7,2.8,7.1,6.8,7.1,11.9c0,4.9-2.4,8.8-7.2,11.6c-4.8,2.8-11.1,4.1-18.7,3.7c-7.5-0.4-15.1-2-23.1-5   c-7.9-3-13.7-6.6-17.3-10.8l-15,21c5.8,5.6,14.1,10.3,24.8,13.9C771.6,208.7,782.3,210.6,793.1,210.6 M928.4,68.6   c-24,0-42.3,7.7-54.9,23.2l20.7,18.8c8.6-10.9,19.5-16.4,32.8-16.4c8.7,0,15.9,2.1,21.6,6.4c5.6,4.3,8.5,10.8,8.5,19.5v12.3   l-22.7-3c-21.5-2.9-37.6-0.5-48.4,7.4c-10.8,7.8-16.2,18.5-16.2,31.9c0,12.2,4,22.2,11.9,30c7.9,7.8,18,11.7,30.2,11.7   c15.6,0,31.3-6.6,46.9-19.7l1.4,16.9h26.7v-85.7c0-17.3-5.5-30.5-16.5-39.7C959.3,73.2,945.3,68.6,928.4,68.6 M900.6,167.2   c0-14,12.8-19.1,38.5-15.3l18,2.7v12.3c-13.8,11.3-26.6,16.9-38.2,16.9c-5.5,0-9.9-1.5-13.2-4.5   C902.3,176.3,900.6,172.2,900.6,167.2"/>
	
		<linearGradient id="GATOR_COMPOSTO_00000106843762856758494570000006245090259350517385_" gradientUnits="userSpaceOnUse" x1="614.6611" y1="303.1967" x2="986.4443" y2="303.1967">
		<stop offset="0" style="stop-color:#259DA9"/>
		<stop offset="9.385610e-02" style="stop-color:#259DA9"/>
		<stop offset="0.2776" style="stop-color:#2C9FA8"/>
		<stop offset="0.5412" style="stop-color:#3FA5A4"/>
		<stop offset="0.8516" style="stop-color:#5EAF9F"/>
		<stop offset="1" style="stop-color:#6FB49C"/>
	</linearGradient>
	<path id="GATOR_COMPOSTO" style="fill:url(#GATOR_COMPOSTO_00000106843762856758494570000006245090259350517385_);" d="   M687.8,259.1v75.1c0,22.2-13.8,38.9-35.9,38.9c-9.6,0-17-2.7-23.4-7.1v-14.6c6.1,5.8,13.8,9.9,24.3,9.9c12.9,0,21.7-10.5,21.7-27.1   v-9.6c-6.1,7.4-14.7,12-24.9,12c-21.4,0-35-17.5-35-39.5c0-22.2,13.5-39.5,35-39.5c10.5,0,19.3,4.9,25.4,12.6l0.6-11.1H687.8z    M674.5,305.2v-16.1c-3-11.4-12.2-19.6-22.8-19.6c-14.9,0-23.9,12.3-23.9,27.7c0,15.2,9,27.5,23.9,27.5   C662.4,324.6,671.5,316.4,674.5,305.2z M770.8,286.5v48.6h-11.9l-0.8-10.8c-8.2,7.3-18.2,12.3-28.1,12.3   c-13.5,0-23.3-9.7-23.3-23.3s10.3-25.5,36.9-21.1l13.8,2.3v-9c0-11.6-8.5-16.6-18.8-16.6c-9,0-15.8,3.6-20.4,10.5l-9.3-8.2   c5.8-8.4,15.8-13.7,30.2-13.7C756.8,257.6,770.8,266.9,770.8,286.5z M733.1,324.6c8.8,0,17.3-5,24.5-11.6v-8.7l-12.5-2.1   c-19.2-3.5-24.6,3-24.6,10.5C720.5,319.9,725.5,324.6,733.1,324.6z M834.9,330.7c-3.6,3.8-9,5.9-16,5.9c-14.1,0-23.3-9.3-23.3-22.8   v-44.2h-9.9v-10.5h9.9v-25.8h13.4v25.8h20.7v10.5h-20.5v44.2c0,7.4,3.8,11.2,10,11.2c3.3,0,5.9-1.1,8.2-3.5L834.9,330.7z    M842.2,297.1c0-22,14.9-39.5,37.1-39.5c22,0,37.1,17.5,37.1,39.5c0,21.9-15,39.5-37.1,39.5C857.1,336.6,842.2,319,842.2,297.1z    M903.2,297.1c0-15.4-9.3-27.7-23.9-27.7c-14.9,0-23.9,12.3-23.9,27.7s9,27.5,23.9,27.5C893.9,324.6,903.2,312.5,903.2,297.1z    M986.4,262.2l-6.5,9.7c-1.7-0.9-5.2-2.4-10.6-2.4c-11.1,0-21.4,9.6-21.4,23.1v42.6h-13.4v-76h12.3l0.6,11.6   c5.5-7.9,13.7-13.1,22.5-13.1C977.9,257.6,982.2,259,986.4,262.2z"/>
	<g id="UNIÃO_00000078033363591709907910000013419209120345672334_">
		<defs>
			<path id="SVGID_00000173853901104609241280000016888520204465597853_" d="M13.3,193.2c0-81.2,66.1-147.3,147.3-147.3     c81.2,0,147.3,66.1,147.3,147.3s-66.1,147.3-147.3,147.3C79.3,340.5,13.3,274.4,13.3,193.2 M1,193.2     c0,88.1,71.5,159.6,159.6,159.6c88.1,0,159.6-71.5,159.6-159.6c0-88.1-71.5-159.6-159.6-159.6C72.4,33.6,1,105,1,193.2"/>
		</defs>
		
			<linearGradient id="SVGID_00000080202510326332690060000003616632374784076969_" gradientUnits="userSpaceOnUse" x1="0.9775" y1="193.1861" x2="320.1891" y2="193.1861">
			<stop offset="0" style="stop-color:#259DA9"/>
			<stop offset="9.385610e-02" style="stop-color:#259DA9"/>
			<stop offset="0.2776" style="stop-color:#2C9FA8"/>
			<stop offset="0.5412" style="stop-color:#3FA5A4"/>
			<stop offset="0.8516" style="stop-color:#5EAF9F"/>
			<stop offset="1" style="stop-color:#6FB49C"/>
		</linearGradient>
		
			<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#SVGID_00000173853901104609241280000016888520204465597853_" style="overflow:visible;fill:url(#SVGID_00000080202510326332690060000003616632374784076969_);"/>
		<clipPath id="SVGID_00000005967053008322269020000004235176972315630231_">
			<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#SVGID_00000173853901104609241280000016888520204465597853_" style="overflow:visible;"/>
		</clipPath>
		
			<linearGradient id="SVGID_00000085941942468207552850000010742951912116418225_" gradientUnits="userSpaceOnUse" x1="3123.325" y1="-234.899" x2="3128.052" y2="-234.899" gradientTransform="matrix(67.5288 0 0 -67.5288 -210913.375 -15669.2559)">
			<stop offset="0" style="stop-color:#259DA9"/>
			<stop offset="9.385610e-02" style="stop-color:#259DA9"/>
			<stop offset="0.2776" style="stop-color:#2C9FA8"/>
			<stop offset="0.5412" style="stop-color:#3FA5A4"/>
			<stop offset="0.8516" style="stop-color:#5EAF9F"/>
			<stop offset="1" style="stop-color:#6FB49C"/>
		</linearGradient>
		
			<rect x="1" y="33.6" style="clip-path:url(#SVGID_00000005967053008322269020000004235176972315630231_);fill:url(#SVGID_00000085941942468207552850000010742951912116418225_);" width="319.2" height="319.2"/>
	</g>
	<g id="CIRCULO_00000075164981204085727700000010805892888471084206_">
		<defs>
			<path id="SVGID_00000034784258274561635010000013875884708273423537_" d="M21.6,193.2c0,76.6,62.3,139,139,139     c76.6,0,139-62.3,139-139c0-76.6-62.3-139-139-139C83.9,54.2,21.6,116.5,21.6,193.2"/>
		</defs>
		
			<linearGradient id="SVGID_00000122684259272636328690000012217619032443918487_" gradientUnits="userSpaceOnUse" x1="21.6016" y1="193.1838" x2="299.5698" y2="193.1838">
			<stop offset="0" style="stop-color:#259DA9"/>
			<stop offset="9.385610e-02" style="stop-color:#259DA9"/>
			<stop offset="0.2776" style="stop-color:#2C9FA8"/>
			<stop offset="0.5412" style="stop-color:#3FA5A4"/>
			<stop offset="0.8516" style="stop-color:#5EAF9F"/>
			<stop offset="1" style="stop-color:#6FB49C"/>
		</linearGradient>
		
			<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#SVGID_00000034784258274561635010000013875884708273423537_" style="overflow:visible;fill:url(#SVGID_00000122684259272636328690000012217619032443918487_);"/>
		<clipPath id="SVGID_00000167367811193207143770000017504327454003904698_">
			<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#SVGID_00000034784258274561635010000013875884708273423537_" style="overflow:visible;"/>
		</clipPath>
		
			<linearGradient id="SVGID_00000182516815068672753230000014735093030572984767_" gradientUnits="userSpaceOnUse" x1="3115.9741" y1="-236.6171" x2="3120.7012" y2="-236.6171" gradientTransform="matrix(58.8038 0 0 -58.8038 -183209.6406 -13720.8125)">
			<stop offset="0" style="stop-color:#259DA9"/>
			<stop offset="9.385610e-02" style="stop-color:#259DA9"/>
			<stop offset="0.2776" style="stop-color:#2C9FA8"/>
			<stop offset="0.5412" style="stop-color:#3FA5A4"/>
			<stop offset="0.8516" style="stop-color:#5EAF9F"/>
			<stop offset="1" style="stop-color:#6FB49C"/>
		</linearGradient>
		
			<rect x="21.6" y="54.2" style="clip-path:url(#SVGID_00000167367811193207143770000017504327454003904698_);fill:url(#SVGID_00000182516815068672753230000014735093030572984767_);" width="278" height="278"/>
	</g>
	<g id="Logo_Grupo_3_00000018213847717821715210000005025750340238853785_">
		<defs>
			<path id="SVGID_00000157989880720150205630000017935519958274208428_" d="M121,168.7l-8.9,8.6c-8.9,8.6,3.5,18.4,3.5,18.4     l65,27.2l36.5-18c0,0-3.2-6.6-11.1-12.3c-7.9-5.7-69.1-29.4-69.1-29.4L121,168.7z"/>
		</defs>
		<clipPath id="SVGID_00000069393634967839338150000004492166542887284374_">
			<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#SVGID_00000157989880720150205630000017935519958274208428_" style="overflow:visible;"/>
		</clipPath>
		
			<linearGradient id="SVGID_00000159453877082224358410000003804643089544571010_" gradientUnits="userSpaceOnUse" x1="3026.75" y1="-257.4817" x2="3031.4771" y2="-257.4817" gradientTransform="matrix(22.8836 0 0 -22.8836 -69154.125 -5699.2178)">
			<stop offset="0" style="stop-color:#D9D9D8"/>
			<stop offset="1.676080e-02" style="stop-color:#D9D9D8"/>
			<stop offset="0.2019" style="stop-color:#E1E1E0"/>
			<stop offset="0.9966" style="stop-color:#FFFFFF"/>
			<stop offset="1" style="stop-color:#FFFFFF"/>
		</linearGradient>
		
			<rect x="103.3" y="163" style="clip-path:url(#SVGID_00000069393634967839338150000004492166542887284374_);fill:url(#SVGID_00000159453877082224358410000003804643089544571010_);" width="113.8" height="59.7"/>
	</g>
	<g id="Logo_Grupo_2_00000000922542137478033560000001921566010647714202_">
		<defs>
			<path id="SVGID_00000036238696426282587020000014580387241736131211_" d="M123.3,199.4c0,0-0.1,0-0.1-0.1     C123.2,199.4,123.3,199.4,123.3,199.4 M182.7,109.3c-28,10.1-90,25.6-86.2,58.7c0,0,1.5,21.2,26.6,31.3     c-2.5-1-37.5-16.3,33.3-38.3c73.3-22.8,66.9-49.7,66.9-49.7s-0.3-14.8-17.3-19.1C206.1,92.2,210.7,99.2,182.7,109.3"/>
		</defs>
		<clipPath id="SVGID_00000119829272660220358010000009921006701335539391_">
			<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#SVGID_00000036238696426282587020000014580387241736131211_" style="overflow:visible;"/>
		</clipPath>
		
			<linearGradient id="SVGID_00000111173387312227522800000006573348949044594851_" gradientUnits="userSpaceOnUse" x1="3048.4492" y1="-251.0068" x2="3053.1763" y2="-251.0068" gradientTransform="matrix(26.8941 0 0 -26.8941 -81888.7812 -6604.7798)">
			<stop offset="0" style="stop-color:#FFFFFF"/>
			<stop offset="9.385580e-02" style="stop-color:#FFFFFF"/>
			<stop offset="0.4052" style="stop-color:#F6F6F6"/>
			<stop offset="0.9193" style="stop-color:#DDDDDD"/>
			<stop offset="1" style="stop-color:#D9D9D8"/>
		</linearGradient>
		
			<rect x="85.7" y="92.2" style="clip-path:url(#SVGID_00000119829272660220358010000009921006701335539391_);fill:url(#SVGID_00000111173387312227522800000006573348949044594851_);" width="144.1" height="107.2"/>
	</g>
	<g id="Logo_Grupo_1_00000013871734121764538270000012207211168876901564_">
		<defs>
			<path id="SVGID_00000006685372228095636880000008933925423831284623_" d="M164.7,226.2c-73.7,21.4-67.8,48.4-67.8,48.4     s0,14.8,16.9,19.5c0,0-4.5-7.1,23.7-16.7c28.1-9.6,90.4-24,87.2-57.2c0,0-1.1-21.2-26-31.8C201.1,189.6,235.9,205.5,164.7,226.2      M198.6,188.6c-0.1,0-0.1-0.1-0.1-0.1C198.5,188.5,198.6,188.5,198.6,188.6 M198.5,188.5C198.5,188.5,198.5,188.5,198.5,188.5"/>
		</defs>
		<clipPath id="SVGID_00000081650132982204303370000003888115171711583907_">
			<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#SVGID_00000006685372228095636880000008933925423831284623_" style="overflow:visible;"/>
		</clipPath>
		
			<linearGradient id="SVGID_00000122720498800339491030000005219200277803583162_" gradientUnits="userSpaceOnUse" x1="3296.6865" y1="-190.5748" x2="3301.4136" y2="-190.5748" gradientTransform="matrix(-26.8896 -0.4894 -0.4894 26.8896 88777.7656 6980.1807)">
			<stop offset="0" style="stop-color:#D9D9D8"/>
			<stop offset="2.569840e-02" style="stop-color:#D9D9D8"/>
			<stop offset="0.9922" style="stop-color:#FFFFFF"/>
			<stop offset="1" style="stop-color:#FFFFFF"/>
		</linearGradient>
		
			<polygon style="clip-path:url(#SVGID_00000081650132982204303370000003888115171711583907_);fill:url(#SVGID_00000122720498800339491030000005219200277803583162_);" points="    235.9,296.8 89,294.1 91,185.9 237.8,188.5   "/>
	</g>
</g>`;

const getNoiseOverlay = () => `
  <div style="
    position: absolute;
    inset: 0;
    background-image: url('${NOISE_PATTERN}');
    opacity: 0.08;
    pointer-events: none;
    z-index: 1;
    mix-blend-mode: overlay;
  "></div>
`;

// PEPPER LOGO (Top Corner Icon)
const PEPPER_SVG_CONTENT = `
<svg viewBox="-15 0 160 220" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
  <defs>
    <style>
      .cls-1 { fill: url(#Gradiente_sem_nome_5); }
      .cls-2 { fill: none; }
      .cls-3 { clip-path: url(#clippath-1); }
      .cls-4 { fill: url(#Gradiente_sem_nome_7); }
      .cls-5 { fill: url(#Gradiente_sem_nome_6); }
      .cls-6 { clip-path: url(#clippath-2); }
      .cls-7 { clip-path: url(#clippath); }
    </style>
    <clipPath id="clippath">
      <path class="cls-2" d="M24.67,76.5l-8.9,8.6c-8.9,8.6,3.5,18.4,3.5,18.4l65,27.2,36.5-18s-3.2-6.6-11.1-12.3c-7.9-5.7-69.1-29.4-69.1-29.4l-15.9,5.5Z"/>
    </clipPath>
    <linearGradient id="Gradiente_sem_nome_5" data-name="Gradiente sem nome 5" x1="2084.11" y1="819.23" x2="2088.84" y2="819.23" gradientTransform="translate(-47679.47 -18646.23) scale(22.88)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#d9d9d8"/>
      <stop offset=".02" stop-color="#d9d9d8"/>
      <stop offset=".2" stop-color="#e1e1e0"/>
      <stop offset="1" stop-color="#fff"/>
      <stop offset="1" stop-color="#fff"/>
    </linearGradient>
    <clipPath id="clippath-1">
      <path class="cls-2" d="M26.97,107.2s-.1,0-.1-.1c.1,0,.1.1.1.1M86.37,17.1C58.37,27.2-3.63,42.7.17,75.8c0,0,1.5,21.2,26.6,31.3-2.5-1-37.5-16.3,33.3-38.3,73.3-22.8,66.9-49.7,66.9-49.7,0,0-.3-14.8-17.3-19.1.1,0,4.7,7-23.3,17.1Z"/>
    </clipPath>
    <linearGradient id="Gradiente_sem_nome_6" data-name="Gradiente sem nome 6" x1="2100.05" y1="811.66" x2="2104.77" y2="811.66" gradientTransform="translate(-56478.69 -21775.35) scale(26.89)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff"/>
      <stop offset=".09" stop-color="#fff"/>
      <stop offset=".41" stop-color="#f6f6f6"/>
      <stop offset=".92" stop-color="#ddd"/>
      <stop offset="1" stop-color="#d9d9d8"/>
    </linearGradient>
    <clipPath id="clippath-2">
      <path class="cls-2" d="M68.37,134C-5.33,155.4.57,182.4.57,182.4c0,0,0,14.8,16.9,19.5,0,0-4.5-7.1,23.7-16.7,28.1-9.6,90.4-24,87.2-57.2,0,0-1.1-21.2-26-31.8,2.4,1.2,37.2,17.1-34,37.8M102.37,96.3c-.1,0-.1-.1-.1-.1q0,.1.1.1"/>
    </clipPath>
    <linearGradient id="Gradiente_sem_nome_7" data-name="Gradiente sem nome 7" x1="2282.36" y1="739.36" x2="2287.09" y2="739.36" gradientTransform="translate(61138.05 21148.38) rotate(-178.96) scale(26.89)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#d9d9d8"/>
      <stop offset=".03" stop-color="#d9d9d8"/>
      <stop offset=".99" stop-color="#fff"/>
      <stop offset="1" stop-color="#fff"/>
    </linearGradient>
  </defs>
  <g>
    <g class="cls-7"><rect class="cls-1" x="6.97" y="70.8" width="113.8" height="59.7"/></g>
    <g class="cls-3"><rect class="cls-5" x="-10.63" y="0" width="144.1" height="107.2"/></g>
    <g class="cls-6"><polygon class="cls-4" points="139.57 204.5 -7.33 201.9 -5.33 93.6 141.47 96.3 139.57 204.5"/></g>
  </g>
</svg>
`;

// Helper to inject Pepper Logo
const getPepperLogoHtml = (style: string, noShadow: boolean = false) => `
  <div style="${style}">
    ${noShadow ? PEPPER_SVG_CONTENT.replace('filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));', '') : PEPPER_SVG_CONTENT}
  </div>
`;

// Upload icon shown over a photo slot on hover (paired with the `.upload-hover-zone`
// / `.upload-hover-img` CSS in index.html, which handles the blur+grayscale and
// fade-in). Clicking calls the window.__triggerImageUpload bridge wired up in
// App.tsx, which opens the same file picker the sidebar's upload controls use.
const getUploadOverlayHtml = (id: string, field: string = 'photoUrl', index?: number): string => `
  <div class="upload-hover-icon" onclick="window.__triggerImageUpload && window.__triggerImageUpload('${id}', '${field}'${index !== undefined ? `, ${index}` : ''})">
    <div style="width: 15%; min-width: 44px; max-width: 64px; aspect-ratio: 1; border-radius: 50%; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; border: 2px solid rgba(255,255,255,0.65); box-shadow: 0 4px 16px rgba(0,0,0,0.35);">
      <svg width="46%" height="46%" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    </div>
  </div>
`;

// Updated to use rectangular confetti with mixed sizes and blur for depth
const getBackgroundConfetti = () => `
  <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; opacity: 0.6;">
     <svg width="100%" height="100%" viewBox="0 0 360 350" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">
        <!-- Large Blurred Rects (Background depth) -->
        <rect x="20" y="50" width="16" height="22" fill="#E879F9" transform="rotate(45 28 61)" opacity="0.4" style="filter: blur(2px);" />
        <rect x="300" y="80" width="20" height="14" fill="#22D3EE" transform="rotate(-15 310 87)" opacity="0.4" style="filter: blur(2px);" />
        <rect x="50" y="300" width="22" height="22" fill="#FACC15" transform="rotate(30 61 311)" opacity="0.4" style="filter: blur(2px);" />
        <rect x="320" y="250" width="16" height="26" fill="#A78BFA" transform="rotate(-45 328 263)" opacity="0.4" style="filter: blur(2px);" />

        <!-- Medium Sharp Rects -->
        <rect x="80" y="40" width="10" height="14" fill="#F472B6" transform="rotate(-20 85 47)" opacity="0.8" />
        <rect x="250" y="60" width="12" height="12" fill="#22D3EE" transform="rotate(15 256 66)" opacity="0.8" />
        <rect x="40" y="150" width="8" height="16" fill="#FACC15" transform="rotate(60 44 158)" opacity="0.8" />
        <rect x="310" y="180" width="14" height="10" fill="#A855F7" transform="rotate(-30 317 185)" opacity="0.8" />
        <rect x="60" y="280" width="11" height="11" fill="#4ADE80" transform="rotate(45 65 285)" opacity="0.8" />
        <rect x="290" y="320" width="10" height="18" fill="#FB7185" transform="rotate(-10 295 329)" opacity="0.8" />

        <!-- Small Sharp Confetti (Details) -->
        <rect x="150" y="20" width="6" height="6" fill="#60A5FA" transform="rotate(45 153 23)" opacity="0.9" />
        <rect x="200" y="90" width="5" height="10" fill="#F472B6" transform="rotate(-15 202 95)" opacity="0.9" />
        <rect x="120" y="320" width="8" height="5" fill="#22D3EE" transform="rotate(20 124 322)" opacity="0.9" />
        <rect x="220" y="300" width="6" height="6" fill="#FACC15" transform="rotate(45 223 303)" opacity="0.9" />
        
        <!-- More scattered pieces -->
        <rect x="20" y="220" width="9" height="13" fill="#E879F9" transform="rotate(-45 24 226)" opacity="0.7" />
        <rect x="340" y="120" width="8" height="8" fill="#34D399" transform="rotate(30 344 124)" opacity="0.7" />
        <rect x="180" y="340" width="10" height="10" fill="#A78BFA" transform="rotate(15 185 345)" opacity="0.7" />
        <rect x="260" y="20" width="7" height="11" fill="#FBBF24" transform="rotate(-20 263 25)" opacity="0.7" />
        <rect x="100" y="120" width="9" height="6" fill="#22D3EE" transform="rotate(10 104 123)" opacity="0.7" />
        <rect x="280" y="200" width="6" height="12" fill="#F472B6" transform="rotate(-10 283 206)" opacity="0.7" />
     </svg>
  </div>
`;

// FILLED ICONS for Signature - RESIZED TO 20x20 AND CLEANER PATHS
const getLinkedinIcon = (fill: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${fill}"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>`;
const getInstagramIcon = (fill: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${fill}"><path fill-rule="evenodd" d="M7.5 2c-3.037 0-5.5 2.462-5.5 5.5v9c0 3.038 2.463 5.5 5.5 5.5h9c3.037 0 5.5-2.462 5.5-5.5v-9c0-3.038-2.463-5.5-5.5-5.5h-9zm9 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" clip-rule="evenodd"/></svg>`;
// Replaced with standard Material Design 'Language' icon for Globe/Website
const getGlobeIcon = (fill: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${fill}"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.33-.14 2 0 .67.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A8.008 8.008 0 0 1 5.08 16zm2.95-8H5.08a8.008 8.008 0 0 1 4.33-3.56A15.65 15.65 0 0 0 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg>`;
const getWhatsappIcon = (fill: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${fill}"><path d="M12 2C6.48 2 2 6.48 2 12C2 13.84 2.48 15.56 3.32 17.08L2 22L7.05 20.73C8.52 21.54 10.21 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20.3C10.5 20.3 9.09 19.9 7.88 19.21L7.58 19.04L4.6 19.79L5.37 16.96L5.17 16.63C4.43 15.34 4 13.75 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20.3 12 20.3Z"/><path d="M16.65 14.77C16.4 14.65 15.15 14.04 14.92 13.96C14.69 13.88 14.52 13.83 14.35 14.08C14.18 14.33 13.7 14.89 13.56 15.06C13.42 15.23 13.27 15.25 13.02 15.13C12.77 15.01 11.96 14.74 11 13.89C10.25 13.22 9.75 12.4 9.62 12.18C9.5 11.96 9.61 11.84 9.73 11.72C9.85 11.61 9.99 11.43 10.11 11.29C10.24 11.15 10.28 11.05 10.36 10.88C10.45 10.71 10.4 10.57 10.34 10.44C10.28 10.31 9.79 9.11 9.58 8.63C9.38 8.16 9.18 8.22 9.03 8.22C8.89 8.22 8.73 8.22 8.56 8.22C8.39 8.22 8.12 8.28 7.89 8.53C7.66 8.78 7.02 9.38 7.02 10.61C7.02 11.84 7.92 13.03 8.04 13.19C8.17 13.36 9.8 15.86 12.29 16.93C12.88 17.19 13.34 17.34 13.7 17.46C14.31 17.65 14.87 17.63 15.31 17.56C15.8 17.49 16.82 16.95 17.03 16.35C17.25 15.75 17.25 15.23 17.19 15.13C17.12 15.03 16.9 14.9 16.65 14.77Z"/></svg>`;


// Shared Sphere Elements
const getSpheresHtml = (variant: 'portrait' | 'landscape' | 'anniversary' | 'anniversary_landscape' | 'welcome' | 'signature' | 'signature_logo' | 'farewell' | 'job_change' | 'provider' | 'hiring' | 'brand' = 'portrait') => {
  const noise = getNoiseOverlay();

  // Pure two-stop cyan -> purple gradient, matching the photo panel background exactly.
  if (variant === 'brand') {
    return `
      <!-- Large Sphere (Bottom Right) -->
      <div style="
        position: absolute;
        bottom: -60px;
        right: -60px;
        width: 220px;
        height: 220px;
        border-radius: 50%; -webkit-clip-path: circle(49.8% at 50% 50%); clip-path: circle(49.8% at 50% 50%);
        background: linear-gradient(135deg, #22d3ee 0%, #594C99 100%);
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        z-index: 1;
        overflow: hidden;
      ">
         ${noise}
      </div>
      <!-- Small Sphere (Top Left) -->
      <div style="
        position: absolute;
        top: -30px;
        left: -30px;
        width: 130px;
        height: 130px;
        border-radius: 50%; -webkit-clip-path: circle(49.8% at 50% 50%); clip-path: circle(49.8% at 50% 50%);
        background: linear-gradient(135deg, #22d3ee 0%, #594C99 100%);
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        z-index: 1;
        overflow: hidden;
      ">
         ${noise}
      </div>
    `;
  }

  if (variant === 'hiring') {
    return `
      <!-- Single Large Sphere Top Right (Hiring) -->
      <div style="
        position: absolute;
        top: -120px;
        right: -100px;
        width: 350px; 
        height: 350px;
        border-radius: 50%; -webkit-clip-path: circle(49.8% at 50% 50%); clip-path: circle(49.8% at 50% 50%);
        background: linear-gradient(225deg, #22d3ee 0%, #594C99 100%);
        box-shadow: -10px 10px 30px rgba(0,0,0,0.15);
        z-index: 1;
        overflow: hidden;
      ">
         ${noise}
      </div>
    `;
  }

  // NEW PROVIDER SPHERES (Green Gradient)
  if (variant === 'provider') {
     return `
      <!-- Provider Sphere (Top Left) -->
      <div style="
        position: absolute;
        top: -80px;
        left: -80px;
        width: 320px; 
        height: 320px;
        border-radius: 50%; -webkit-clip-path: circle(49.8% at 50% 50%); clip-path: circle(49.8% at 50% 50%);
        background: radial-gradient(circle at 30% 30%, #17261d 0%, #191e1b 100%);
        box-shadow: 0 0 30px #264743, inset 0 0 40px #264743;
        z-index: 1;
        overflow: hidden;
      ">
         ${noise}
      </div>
       <!-- Provider Sphere (Bottom Right) -->
      <div style="
        position: absolute;
        bottom: -50px;
        right: -50px;
        width: 250px; 
        height: 250px;
        border-radius: 50%; -webkit-clip-path: circle(49.8% at 50% 50%); clip-path: circle(49.8% at 50% 50%);
        background: radial-gradient(circle at 70% 70%, #17261d 0%, #191e1b 100%);
        box-shadow: 0 0 30px #264743, inset 0 0 40px #264743;
        z-index: 1;
        overflow: hidden;
      ">
         ${noise}
      </div>
     `;
  }

  if (variant === 'anniversary') {
    return `
      <!-- Single Centered Sphere (Anniversary) -->
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -30%); /* Centered horizontally, shifted down to be below title */
        width: 240px; 
        height: 240px;
        border-radius: 50%; -webkit-clip-path: circle(49.8% at 50% 50%); clip-path: circle(49.8% at 50% 50%);
        background: linear-gradient(135deg, #e9d5ff 0%, #a855f7 45%, #22d3ee 100%);
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        z-index: 1;
        overflow: hidden;
      ">
         ${noise}
      </div>
    `;
  }

  if (variant === 'anniversary_landscape') {
    return `
      <!-- Single Centered Sphere (Anniversary Landscape) - PERFECTLY CENTERED -->
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%); /* Perfectly centered */
        width: 240px; 
        height: 240px;
        border-radius: 50%; -webkit-clip-path: circle(49.8% at 50% 50%); clip-path: circle(49.8% at 50% 50%);
        background: linear-gradient(135deg, #e9d5ff 0%, #a855f7 45%, #22d3ee 100%);
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        z-index: 1;
        overflow: hidden;
      ">
         ${noise}
      </div>
    `;
  }

  if (variant === 'welcome') {
    return `
      <!-- Single Large Sphere Left (Welcome) -->
      <!-- Updated Purple: #594C99 -->
      <div style="
        position: absolute;
        top: 50%;
        left: -120px; /* Shifted left */
        transform: translateY(-50%); /* Centered vertically */
        width: 380px; 
        height: 380px;
        border-radius: 50%; -webkit-clip-path: circle(49.8% at 50% 50%); clip-path: circle(49.8% at 50% 50%);
        background: linear-gradient(135deg, #22d3ee 0%, #594C99 55%, #e9d5ff 100%);
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        z-index: 1;
        overflow: hidden;
      ">
         ${noise}
      </div>
    `;
  }

  if (variant === 'job_change') {
    return `
      <!-- Job Change Spheres (Variation of Welcome) -->
      <div style="
        position: absolute;
        top: 50%;
        left: -140px; 
        transform: translateY(-50%) rotate(45deg); 
        width: 360px; 
        height: 360px;
        border-radius: 50%; -webkit-clip-path: circle(49.8% at 50% 50%); clip-path: circle(49.8% at 50% 50%);
        background: linear-gradient(135deg, #e9d5ff 0%, #594C99 45%, #22d3ee 100%);
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        z-index: 1;
        overflow: hidden;
      ">
         ${noise}
      </div>
       <!-- Small accent sphere right -->
      <div style="
        position: absolute;
        bottom: 40px;
        right: -30px;
        width: 100px; 
        height: 100px;
        border-radius: 50%; -webkit-clip-path: circle(49.8% at 50% 50%); clip-path: circle(49.8% at 50% 50%);
        background: linear-gradient(135deg, #22d3ee 0%, #a855f7 100%);
        box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        z-index: 1;
        overflow: hidden;
      ">
         ${noise}
      </div>
    `;
  }

  if (variant === 'farewell') {
    return `
      <!-- Single Large Sphere Top Right (Farewell) -->
      <div style="
        position: absolute;
        top: -120px;
        right: -100px;
        width: 350px; 
        height: 350px;
        border-radius: 50%; -webkit-clip-path: circle(49.8% at 50% 50%); clip-path: circle(49.8% at 50% 50%);
        background: linear-gradient(225deg, #22d3ee 0%, #594C99 55%, #e9d5ff 100%); /* Rotated gradient */
        box-shadow: -10px 10px 30px rgba(0,0,0,0.15);
        z-index: 1;
        overflow: hidden;
      ">
         ${noise}
      </div>
    `;
  }

  if (variant === 'signature') {
    return `
      <!-- Signature Sphere (Landscape Left) -->
      <div style="
        position: absolute;
        top: 50%;
        left: -80px;
        transform: translateY(-50%);
        width: 250px; 
        height: 250px;
        border-radius: 50%; -webkit-clip-path: circle(49.8% at 50% 50%); clip-path: circle(49.8% at 50% 50%);
        background: linear-gradient(135deg, #22d3ee 0%, #594C99 55%, #e9d5ff 100%);
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        z-index: 1;
        overflow: hidden;
      ">
         ${noise}
      </div>
    `;
  }

  if (variant === 'signature_logo') {
    return `
      <!-- Signature Sphere (Banner Right) -->
      <div style="
        position: absolute;
        top: 50%;
        right: -80px; 
        transform: translateY(-50%);
        width: 240px; 
        height: 240px;
        border-radius: 50%; -webkit-clip-path: circle(49.8% at 50% 50%); clip-path: circle(49.8% at 50% 50%);
        background: linear-gradient(135deg, #22d3ee 0%, #9333ea 100%); 
        box-shadow: -10px 0 40px rgba(0,0,0,0.2);
        z-index: 1;
        overflow: hidden;
      ">
         ${noise}
      </div>
    `;
  }
  
  // Position adjustments for landscape to avoid blocking logo
  const smallSpherePos = variant === 'landscape' 
    ? 'top: -60px; left: -20px;' 
    : 'top: -30px; left: -30px;';
    
  return `
    <!-- Large Sphere (Bottom Right) -->
    <div style="
      position: absolute;
      bottom: -60px;
      right: -60px;
      width: 220px; 
      height: 220px;
      border-radius: 50%; -webkit-clip-path: circle(49.8% at 50% 50%); clip-path: circle(49.8% at 50% 50%);
      background: linear-gradient(135deg, #e9d5ff 0%, #a855f7 45%, #22d3ee 100%);
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      z-index: 1;
      overflow: hidden;
    ">
       ${noise}
    </div>

    <!-- Small Sphere (Top Left) -->
    <div style="
      position: absolute;
      ${smallSpherePos}
      width: 130px; 
      height: 130px;
      border-radius: 50%; -webkit-clip-path: circle(49.8% at 50% 50%); clip-path: circle(49.8% at 50% 50%);
      background: linear-gradient(135deg, #22d3ee 0%, #a855f7 55%, #e9d5ff 100%);
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      z-index: 1;
      overflow: hidden;
    ">
       ${noise}
    </div>
  `;
};

// --- TRANSLATION CONSTANTS ---
const TEXTS = {
  BIRTHDAY: {
    en: 'HAPPY<br/>BIRTHDAY!',
    pt: 'FELIZ<br/>ANIVERSÁRIO!',
    es: '¡FELIZ<br/>CUMPLEAÑOS!'
  },
  ANNIVERSARY_HEADER: {
    en: 'WORK ANNIVERSARY',
    pt: 'TEMPO DE CASA', // or 'ANIVERSÁRIO DE CASA'
    es: 'ANIVERSARIO LABORAL'
  },
  YEARS: {
    en: 'YEARS',
    pt: 'ANOS',
    es: 'AÑOS'
  },
  YEAR: {
    en: 'YEAR',
    pt: 'ANO',
    es: 'AÑO'
  },
  FAREWELL: {
    en: 'SEE YOU<br/>SOON!',
    pt: 'ATÉ<br/>LOGO!',
    es: '¡HASTA<br/>PRONTO!'
  },
  NEW_ROLE: {
    en: 'NEW<br/>ROLE',
    pt: 'NOVO<br/>CARGO',
    es: 'NUEVO<br/>CARGO'
  },
  PREVIOUS_ROLE_LABEL: {
    en: 'PREVIOUS ROLE',
    pt: 'CARGO ANTERIOR',
    es: 'CARGO ANTERIOR'
  },
  BABY_TITLE: {
    en: 'WELCOME',
    pt: 'SEJA BEM-VINDO(A)',
    es: 'BIENVENIDO'
  }
};

const MONTHS_MAP = {
  en: ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"],
  pt: ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"],
  es: ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
};

// --- HELPER TO GET MONTH NAME ---
const getMonthName = (dateStr: string, language: Language): string => {
  if (!dateStr) return 'MÊS';
  const parts = dateStr.split('/');
  if (parts.length < 2) return 'MÊS';
  
  const monthIndex = parseInt(parts[1], 10) - 1;
  const monthNames = MONTHS_MAP[language] || MONTHS_MAP['en'];
  
  return monthNames[monthIndex] || 'MÊS';
};

const formatTenure = (tenure: string, language: Language): string => {
    if (!tenure) return '';
    // Assume tenure format is "X ANOS" or "1 ANO" from App.tsx
    // We need to strip the number and append correct word
    const number = tenure.split(' ')[0];
    const isPlural = number !== '1';
    const suffix = isPlural ? TEXTS.YEARS[language] : TEXTS.YEAR[language];
    return `${number} ${suffix}`;
}

// --- NEW PROVIDER GENERATOR ---
const generateNewProviderTemplate = (employee: Employee, format: ProviderFormat) => {
    const noise = getNoiseOverlay();
    const spheres = getSpheresHtml('provider');
    // REMOVED 'S' WATERMARK LOGO FOR NEW PROVIDER
    
    // FORMAT DIMENSIONS
    const dims = {
        'pr-small': { w: 600, h: 400 },
        'pr-large': { w: 900, h: 500 },
        'post-sq': { w: 1080, h: 1080 },
        'post-story': { w: 1080, h: 1920 },
        'banner-small': { w: 1400, h: 480 },
        'banner-large': { w: 2160, h: 330 },
    }[format];

    // Background Gradient (Moss Green to Dark Green)
    const background = `linear-gradient(135deg, #1e4d42 0%, #0a261f 100%)`;
    
    // Provider Logo Placeholder
    const providerLogo = employee.providerLogo || 'https://via.placeholder.com/300x150?text=LOGO';
    
    // Game Thumbnails (Default if missing)
    let thumbnails = (employee.gameThumbnails && employee.gameThumbnails.length > 0) 
        ? employee.gameThumbnails 
        : [
            'https://via.placeholder.com/200x300?text=Game+1',
            'https://via.placeholder.com/200x300?text=Game+2',
            'https://via.placeholder.com/200x300?text=Game+3',
            'https://via.placeholder.com/200x300?text=Game+4',
            'https://via.placeholder.com/200x300?text=Game+5',
            'https://via.placeholder.com/200x300?text=Game+6'
        ];
    
    // Filter out empty thumbnails for rendering logic
    const activeThumbnails = thumbnails.filter(t => t !== '');
    if (activeThumbnails.length === 0) activeThumbnails.push(...thumbnails.slice(0, 6));

    // --- GRID GENERATION (3D TILT) ---
    // Creating a grid of div cards
    
    // Get Config Overrides
    const cfg = employee.providerGridConfig || { columns: 0, x: 0, y: 0, rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1, textScale: 1, textX: 0, textY: 0 };
    
    // Text Adjustment Values
    const txtScale = cfg.textScale || 1;
    const txtX = cfg.textX || 0;
    const txtY = cfg.textY || 0;
    const gridScale = cfg.scale || 1;

    // Default Adjust grid columns based on format width to maintain density
    let cols = 3;
    let gridRenderList = activeThumbnails;
    let baseRotateX = 5;
    let baseRotateY = -20;
    let baseRotateZ = -2;
    let baseTranslateYPercent = -50; 

    // Apply defaults per format
    if (format.includes('banner')) {
        const count = activeThumbnails.length;
        cols = Math.ceil(count / 2); 
        if (cols < 4) cols = 4; 
    }
    else if (format === 'post-story') {
        cols = 2; 
        gridRenderList = activeThumbnails.slice(0, 8); 
        baseRotateX = 10;
        baseRotateY = -12;
        baseRotateZ = -3;
    }
    else if (format === 'post-sq') {
        cols = 4; 
        gridRenderList = activeThumbnails.slice(0, 4); 
        baseRotateX = 10;
        baseRotateY = 0;
        baseRotateZ = 0;
    }

    // Apply Column Override if user set it (non-zero)
    if (cfg.columns && cfg.columns > 0) {
        cols = cfg.columns;
        // If specific column count set, show all thumbnails up to a reasonable limit or the list
        gridRenderList = activeThumbnails;
    }

    let gridHtml = '';
    gridRenderList.forEach((thumb, i) => {
        if (!thumb) return;
        gridHtml += `
            <div style="
                width: 100%; 
                aspect-ratio: 2/3; 
                background-image: url('${thumb}'); 
                background-size: cover; 
                background-position: center; 
                border-radius: 8px; 
                box-shadow: 0 10px 20px rgba(0,0,0,0.5);
                border: 1px solid rgba(255,255,255,0.1);
            "></div>
        `;
    });

    // Apply Rotations (Base + Config Offset)
    const finalRotX = baseRotateX + (cfg.rotateX || 0);
    const finalRotY = baseRotateY + (cfg.rotateY || 0);
    const finalRotZ = baseRotateZ + (cfg.rotateZ || 0);

    // Grid Style Variables
    let gridTransform = `perspective(1000px) rotateY(${finalRotY}deg) rotateX(${finalRotX}deg) rotateZ(${finalRotZ}deg) scale(${gridScale})`;
    let gridOrigin = `center right`;
    let gridGap = '8px';

    // Layout Variables
    let logoContainerStyle = '';
    let gridWrapperStyle = '';
    
    let baseTitleSizePx = 32;
    let contentAlign = 'flex-start';
    let textAlignment = 'left';
    
    let logoBoxMinWidth = '260px';
    let logoBoxPadding = '40px 50px';
    let logoImgMaxWidthBase = 200;

    let logoGap = '24px';

    // Base Positioning Logic
    let baseLeft = '';
    let baseTop = '';
    let baseRight = '';
    let baseBottom = '';
    let baseTransform = '';
    let baseWidth = '50%';
    let baseHeight = '80%';
    let baseJustify = 'flex-start';
    let baseAlignItems = 'flex-start';
    
    // Base Logo Position Logic (used for calculating transform offset)
    let logoBaseTransform = '';

    if (format.includes('banner')) {
        baseTitleSizePx = 80;
        logoBaseTransform = 'translateY(-50%)';
        logoContainerStyle = `position: absolute; top: 50%; left: 40px; z-index: 20; max-width: 40%;`;
        
        // Grid Base
        baseTop = '50%';
        baseRight = '-20px';
        baseWidth = '70%';
        baseHeight = '110%';
        baseTransform = `translateY(${baseTranslateYPercent}%)`;
        baseJustify = 'flex-end';
        baseAlignItems = 'center';

    } else if (format === 'post-story') {
        baseTitleSizePx = 100;
        contentAlign = 'center';
        textAlignment = 'center';
        logoBoxMinWidth = '650px';
        logoBoxPadding = '80px 100px';
        logoImgMaxWidthBase = 500;
        gridGap = '25px';
        logoGap = '40px'; 
        gridOrigin = `center bottom`;
        
        logoBaseTransform = 'translate(-50%, -50%)';
        logoContainerStyle = `position: absolute; top: 35%; left: 50%; z-index: 20; text-align: center; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;`;
        
        // Grid Base
        baseBottom = '-120px';
        baseLeft = '50%';
        baseWidth = '90%';
        baseHeight = '75%';
        baseTransform = `translateX(-50%)`; // Only X center
        baseTranslateYPercent = 0; // Not used here in standard way
        baseJustify = 'center';
        baseAlignItems = 'flex-end';
        
    } else if (format === 'post-sq') {
        baseTitleSizePx = 100;
        contentAlign = 'center';
        textAlignment = 'center';
        logoBoxMinWidth = '550px'; 
        logoBoxPadding = '50px 60px'; 
        logoImgMaxWidthBase = 450; 
        gridGap = '20px';
        logoGap = '30px'; 
        gridOrigin = `center bottom`;

        logoBaseTransform = 'translate(-50%, -50%)';
        logoContainerStyle = `position: absolute; top: 40%; left: 50%; z-index: 20; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;`;
        
        // Grid Base
        baseBottom = '-50px';
        baseLeft = '50%';
        baseWidth = '125%';
        baseHeight = '50%';
        baseTransform = `translateX(-50%)`;
        baseTranslateYPercent = 0;
        baseJustify = 'center';
        baseAlignItems = 'flex-end';

    } else if (format === 'pr-large') {
        baseTitleSizePx = 42;
        logoBaseTransform = 'translateY(-50%)';
        logoContainerStyle = `position: absolute; top: 50%; left: 50px; z-index: 20;`;
        
        baseTop = '3%';
        baseRight = '40px';
        baseWidth = '50%';
        baseHeight = '90%';
    } else {
        // Standard/PR-Small
        logoBaseTransform = 'translateY(-50%)';
        logoContainerStyle = `position: absolute; top: 50%; left: 50px; z-index: 20;`;
        
        baseTop = '10%';
        baseRight = '40px';
        baseWidth = '50%';
        baseHeight = '80%';
    }
    
    // Apply Text Transformations
    const titleSize = `${baseTitleSizePx * txtScale}px`;
    // Append user X/Y offsets to base transform
    logoContainerStyle += ` transform: ${logoBaseTransform} translate(${txtX}px, ${txtY}px);`;

    // APPLY POSITION OVERRIDES TO WRAPPER
    // We append the User X/Y to the transform string
    let finalWrapperTransform = baseTransform;
    if (format === 'post-story' || format === 'post-sq') {
        // These use translateX(-50%) as base. We add X/Y to it.
        // translate(calc(-50% + Xpx), Ypx)
        finalWrapperTransform = `translate(calc(-50% + ${cfg.x || 0}px), ${cfg.y || 0}px)`;
    } else if (format.includes('banner')) {
        // uses translateY(-50%).
        // translate(Xpx, calc(-50% + Ypx))
        finalWrapperTransform = `translate(${cfg.x || 0}px, calc(-50% + ${cfg.y || 0}px))`;
    } else {
        // Others don't have a base transform usually (except maybe scale/translate implicitly). 
        // Just translate X/Y
        finalWrapperTransform = `translate(${cfg.x || 0}px, ${cfg.y || 0}px)`;
    }

    gridWrapperStyle = `
        position: absolute; 
        ${baseTop ? `top: ${baseTop};` : ''} 
        ${baseBottom ? `bottom: ${baseBottom};` : ''} 
        ${baseLeft ? `left: ${baseLeft};` : ''} 
        ${baseRight ? `right: ${baseRight};` : ''} 
        width: ${baseWidth}; 
        height: ${baseHeight}; 
        z-index: 10; 
        display: flex; 
        align-items: ${baseAlignItems}; 
        justify-content: ${baseJustify};
        padding-bottom: 0;
        transform: ${finalWrapperTransform};
    `;

    const gridStyle = `
        display: grid;
        grid-template-columns: repeat(${cols}, 1fr);
        gap: ${gridGap};
        width: 100%; 
        transform: ${gridTransform}; 
        transform-origin: ${gridOrigin};
    `;

    const logoScale = employee.providerLogoScale || 1;
    const logoImgMaxWidth = `${logoImgMaxWidthBase * logoScale}px`;

    // Calculate logo size based on format
    let gatorLogoWidth = '180px';
    if (format.includes('banner')) gatorLogoWidth = '140px';
    if (format === 'post-story') gatorLogoWidth = '240px';
    if (format === 'post-sq') gatorLogoWidth = '220px';

    const gatorLogo = `
      <div style="width: ${gatorLogoWidth}; margin-bottom: 10px; display: flex; justify-content: ${contentAlign === 'center' ? 'center' : 'flex-start'};">
         <svg viewBox="0 0 1000 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="fill: white;">
            ${SALSA_GATOR_SVG_CONTENT}
         </svg>
      </div>
    `;

    // Provider Logo Box with Transform
    // Updated to use Orkney Font, no shadow, single line
    const logoBox = `
        <div style="display: flex; flex-direction: column; align-items: ${contentAlign}; gap: ${logoGap};">
            ${gatorLogo}
            <h2 style="font-family: 'Orkney', sans-serif; font-size: ${titleSize}; color: white; margin: 0; letter-spacing: 1px; line-height: 1; padding-left: 5px; text-align: ${textAlignment}; white-space: nowrap;">
                <span style="font-weight: 300;">NEW</span> <span style="font-weight: 700;">PROVIDER</span>
            </h2>
            <div style="
                background: #0f281e; 
                padding: ${logoBoxPadding}; 
                border-radius: 40px; 
                box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 30px #264743, inset 0 0 20px #264743; 
                border: 1px solid #264743;
                display: flex; align-items: center; justify-content: center;
                min-width: ${logoBoxMinWidth};
            ">
                <img src="${providerLogo}" style="width: ${logoImgMaxWidth}; height: auto; object-fit: contain; display: block;" />
            </div>
        </div>
    `;

    return `
    <div id="capture-target" style="width: ${dims.w}px; height: ${dims.h}px; background: ${background}; position: relative; overflow: hidden; box-sizing: border-box;">
       ${noise}
       ${spheres}
       <!-- Removed Watermark Logo -->
       
       <div style="${gridWrapperStyle}">
           <div style="${gridStyle}">
               ${gridHtml}
           </div>
       </div>

       <div style="${logoContainerStyle}">
           ${logoBox}
       </div>
    </div>
  `;
};

// --- MONTHLY GROUP RENDERER ---
const generateMonthGroupTemplate = (employees: Employee[], config: CanvasConfig, language: Language, opts?: { isMonthNamesOnly?: boolean, welcomeVariant?: 'light' | 'dark' }) => {
  const isDark = opts?.welcomeVariant === 'dark';
  const cardBg = isDark ? '#1a1a1a' : '#f1f1f1';
  const fadeColor = '#ffffff';
  const purpleColor = '#594C99';
  const backgroundConfetti = getBackgroundConfetti();
  const noise = getNoiseOverlay();
  const spheres = getSpheresHtml('brand');
  // Adjusted logo size to be smaller (approx 20px width)
  const logo = getPepperLogoHtml('position: absolute; top: 15px; right: 15px; width: 20px; height: 28px; z-index: 60;', true);

  // Determine Month Name from first employee
  const monthName = employees.length > 0 ? getMonthName(employees[0].dateStr, language) : 'ANIVERSARIANTES';
  
  // Dynamic Header Font Size based on Month Name Length
  let headerFontSize = '42px';
  if (monthName.length > 8) headerFontSize = '36px'; 
  if (monthName.length > 10) headerFontSize = '32px'; 

  let containerHeight = 540;
  let flexContent = '';

  if (opts?.isMonthNamesOnly) {
     const listBg = isDark ? '#2a2a2a' : '#ffffff';
     const listDivider = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
     const listNameColor = isDark ? '#f1f1f1' : '#333333';
     let namesHtml = '';
     employees.forEach((emp: Employee) => {
         const day = emp.dateStr.split('/')[0] || '';
         const month = emp.dateStr.split('/')[1] || '';
         const displayName = emp.name.length > 25 ? emp.name.substring(0, 25) + '...' : emp.name;
         namesHtml += `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${listDivider}; padding: 8px 0; width: 100%;">
                <span style="font-family: 'Orkney', sans-serif; font-size: 14px; font-weight: bold; color: ${listNameColor};">${displayName}</span>
                <span class="akira-font" style="font-size: 12px; color: ${purpleColor};">${day}/${month}</span>
            </div>
         `;
     });

     containerHeight = Math.max(540, 160 + (employees.length * 40) + 60);

     flexContent = `
         <div style="display: flex; flex-direction: column; width: 100%; padding: 0 40px; z-index: 10; position: relative; box-sizing: border-box; background: ${listBg}; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-top: 20px; align-self: center;">
            ${namesHtml}
         </div>
     `;
  } else {
      const count = employees.length;
      const isCompact = count > 4;
      const itemWidth = isCompact ? '30%' : '46%'; 
      const dateSize = isCompact ? '7px' : '9px';
      const frameGradient = `linear-gradient(to bottom, ${fadeColor} 0%, rgba(255,255,255,0) 80%), linear-gradient(90deg, ${purpleColor} 0%, #22d3ee 100%)`;

      const columns = isCompact ? 3 : 2;
      const rows = Math.ceil(count / columns);
      containerHeight = 540;
      if (rows > 3) {
          const extraRows = rows - 3;
          containerHeight += (extraRows * 125);
      }

      let gridItems = '';

      employees.forEach((emp: Employee) => {
          const day = emp.dateStr.split('/')[0] || '';
          const month = emp.dateStr.split('/')[1] || '';
          const nameParts = emp.name.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');
          const fullName = `${firstName} ${lastName}`;
          const fullNameLength = fullName.length;
          let fontSizeNum = isCompact ? 8 : 10;
          if (fullNameLength > 10) fontSizeNum -= 1;
          if (fullNameLength > 15) fontSizeNum -= 1;
          if (fullNameLength > 20) fontSizeNum -= 1;
          if (isCompact && fontSizeNum < 5) fontSizeNum = 5;
          if (!isCompact && fontSizeNum < 7) fontSizeNum = 7;
          const finalNameSize = `${fontSizeNum}px`;
          
          const maxLineLen = Math.max(firstName.length, lastName.length);
          const dateLen = 5; 
          const collisionThreshold = isCompact ? 9 : 13;
          const collisionScore = maxLineLen + dateLen;
          const shouldStackDate = collisionScore > collisionThreshold || fullNameLength > 18;

          const nameContainerStyle = shouldStackDate
            ? `position: absolute; bottom: 22px; left: 12px; z-index: 10; pointer-events: none; max-width: 90%;`
            : `position: absolute; bottom: 12px; left: 12px; z-index: 10; pointer-events: none; max-width: 65%;`;

          const dateContainerStyle = shouldStackDate
            ? `position: absolute; bottom: 8px; left: 12px; z-index: 10; pointer-events: none;`
            : `position: absolute; bottom: 14px; right: 12px; z-index: 10; pointer-events: none;`;

          const dateTextAlign = shouldStackDate ? 'left' : 'right';

          gridItems += `
            <div style="width: ${itemWidth}; aspect-ratio: 1; position: relative; box-shadow: 0 8px 20px rgba(0,0,0,0.2); background: ${frameGradient}; overflow: hidden; flex-shrink: 0;">
                <img src="${emp.photoUrl}" style="width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block;"/>
                <div style="${nameContainerStyle}">
                    <p class="akira-font" style="font-size: ${finalNameSize}; color: #ffffff; margin: 0; text-align: left; letter-spacing: 0.5px; line-height: 1; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                        ${firstName}<br/>${lastName}
                    </p>
                </div>
                <div style="${dateContainerStyle}">
                    <p class="akira-font" style="font-size: ${dateSize}; color: #ffffff; margin: 0; text-align: ${dateTextAlign}; opacity: 1; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                        ${day}/${month}
                    </p>
                </div>
            </div>
          `;
      });
      
      flexContent = `<div style="display: flex; flex-wrap: wrap; justify-content: center; align-content: flex-start; gap: 12px; width: 100%; padding: 0 30px; z-index: 10; position: relative; box-sizing: border-box;">${gridItems}</div>`;
  }

  return `
    <div id="capture-target" style="width: 360px; height: ${containerHeight}px; background: ${cardBg}; position: relative; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;">
       <div style="height: 160px; width: 100%; background: linear-gradient(to top, ${fadeColor} 0%, rgba(255,255,255,0) 80%), linear-gradient(90deg, ${purpleColor} 0%, #22d3ee 100%); position: relative; display: flex; align-items: center; justify-content: center; box-sizing: border-box; overflow: hidden; z-index: 20; flex-shrink: 0;">
          ${noise}
          ${spheres}
          ${logo}
          <h1 class="akira-font" style="font-size: ${headerFontSize}; line-height: 1; color: ${cardBg}; margin: 0; text-align: center; letter-spacing: 2px; position: relative; z-index: 10; text-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            ${monthName}
          </h1>
       </div>
       <div style="flex: 1; width: 100%; background: ${cardBg}; position: relative; overflow: hidden; display: flex; align-items: flex-start; justify-content: center; padding-top: 20px; padding-bottom: 20px;">
          ${backgroundConfetti}
          ${flexContent}
       </div>
    </div>
  `;
};

const generateMonthGroupLandscapeTemplate = (employees: Employee[], config: CanvasConfig, language: Language, opts?: { isMonthNamesOnly?: boolean, welcomeVariant?: 'light' | 'dark' }) => {
  const isDark = opts?.welcomeVariant === 'dark';
  const cardBg = isDark ? '#1a1a1a' : '#f1f1f1';
  const fadeColor = '#ffffff';
  const purpleColor = '#594C99';
  const backgroundConfetti = getBackgroundConfetti();
  const noise = getNoiseOverlay();
  const spheres = getSpheresHtml('brand');
  // Adjusted logo size to be smaller (approx 20px width)
  const logo = getPepperLogoHtml('position: absolute; top: 15px; right: 25px; width: 20px; height: 28px; z-index: 60;', true);

  const monthName = employees.length > 0 ? getMonthName(employees[0].dateStr, language) : 'ANIVERSARIANTES';
  let headerFontSize = '42px';
  const count = employees.length;

  const headerHeight = 120;
  let containerHeight = 360;
  let flexContent = '';

  if (opts?.isMonthNamesOnly) {
     const listBg = isDark ? '#2a2a2a' : '#ffffff';
     const listDivider = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
     const listNameColor = isDark ? '#f1f1f1' : '#333333';
     let namesHtml = '';
     employees.forEach((emp: Employee) => {
         const day = emp.dateStr.split('/')[0] || '';
         const month = emp.dateStr.split('/')[1] || '';
         const displayName = emp.name.length > 25 ? emp.name.substring(0, 25) + '...' : emp.name;
         namesHtml += `
            <div style="flex: 0 0 calc(50% - 20px); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${listDivider}; padding: 8px 0; box-sizing: border-box;">
                <span style="font-family: 'Orkney', sans-serif; font-size: 14px; font-weight: bold; color: ${listNameColor};">${displayName}</span>
                <span class="akira-font" style="font-size: 12px; color: ${purpleColor};">${day}/${month}</span>
            </div>
         `;
     });

     containerHeight = Math.max(360, headerHeight + (Math.ceil(employees.length / 2) * 45) + 60);

     flexContent = `
         <div style="display: flex; flex-direction: column; width: 100%; padding: 0 40px; z-index: 10; position: relative; box-sizing: border-box; background: transparent; align-self: center;">
            <div style="background: ${listBg}; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); padding: 20px 30px; display: flex; flex-wrap: wrap; gap: 0 40px;">
                ${namesHtml}
            </div>
         </div>
     `;
  } else {
      let cols = 4; 
      if (count <= 3) cols = 3; 
      if (count > 8) cols = 5; 
      
      const gap = 15;
      const paddingX = 30;
      const itemWidthPct = `calc(${100/cols}% - ${ (gap * (cols - 1)) / cols }px)`;
      const availableWidth = 740 - (paddingX * 2);
      const approxItemSize = (availableWidth - ((cols - 1) * gap)) / cols;
      const rows = Math.ceil(count / cols);
      const bodyPaddingY = 40;
      containerHeight = headerHeight + bodyPaddingY + (rows * approxItemSize) + ((rows - 1) * gap);
      if (containerHeight < 360) containerHeight = 360;
      containerHeight = Math.ceil(containerHeight);

      let gridItems = '';

      employees.forEach(emp => {
          const day = emp.dateStr.split('/')[0] || '';
          const month = emp.dateStr.split('/')[1] || '';
          const nameParts = emp.name.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');
          const fullName = `${firstName} ${lastName}`;
          const fullNameLength = fullName.length;
          let fontSizeNum = 10;
          if (cols >= 5) fontSizeNum = 8; 
          if (fullNameLength > 12) fontSizeNum -= 1;
          if (fullNameLength > 18) fontSizeNum -= 1;
          if (fontSizeNum < 6) fontSizeNum = 6;
          const finalNameSize = `${fontSizeNum}px`;
          const dateSize = cols >= 5 ? '7px' : '9px';
          const shouldStackDate = fullNameLength > 15 || cols >= 5; 
          const nameContainerStyle = shouldStackDate
            ? `position: absolute; bottom: 20px; left: 8px; z-index: 10; pointer-events: none; max-width: 90%;`
            : `position: absolute; bottom: 10px; left: 10px; z-index: 10; pointer-events: none; max-width: 65%;`;
          const dateContainerStyle = shouldStackDate
            ? `position: absolute; bottom: 6px; left: 8px; z-index: 10; pointer-events: none;`
            : `position: absolute; bottom: 12px; right: 10px; z-index: 10; pointer-events: none;`;
          const dateTextAlign = shouldStackDate ? 'left' : 'right';
          const frameGradient = `linear-gradient(to bottom, ${fadeColor} 0%, rgba(255,255,255,0) 80%), linear-gradient(90deg, ${purpleColor} 0%, #22d3ee 100%)`;

          gridItems += `
            <div style="width: ${itemWidthPct}; aspect-ratio: 1; position: relative; box-shadow: 0 4px 10px rgba(0,0,0,0.1); background: ${frameGradient}; overflow: hidden; flex-shrink: 0;">
                <img src="${emp.photoUrl}" style="width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block;"/>
                <div style="${nameContainerStyle}">
                    <p class="akira-font" style="font-size: ${finalNameSize}; color: #ffffff; margin: 0; text-align: left; letter-spacing: 0.5px; line-height: 1; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                        ${firstName}<br/>${lastName}
                    </p>
                </div>
                <div style="${dateContainerStyle}">
                    <p class="akira-font" style="font-size: ${dateSize}; color: #ffffff; margin: 0; text-align: ${dateTextAlign}; opacity: 1; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                        ${day}/${month}
                    </p>
                </div>
            </div>
          `;
      });
      flexContent = `<div style="display: flex; flex-wrap: wrap; justify-content: center; align-content: flex-start; gap: ${gap}px; width: 100%; z-index: 10; position: relative; box-sizing: border-box;">${gridItems}</div>`;
  }

  const headerGradient = `linear-gradient(to top, ${fadeColor} 0%, rgba(255,255,255,0) 80%), linear-gradient(90deg, ${purpleColor} 0%, #22d3ee 100%)`;

  return `
    <div id="capture-target" style="width: 740px; height: ${containerHeight}px; background: ${cardBg}; position: relative; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;">
       <div style="width: 100%; height: ${headerHeight}px; background: ${headerGradient}; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; z-index: 20; flex-shrink: 0;">
          ${noise}
          ${spheres}
          ${logo}
          <h1 class="akira-font" style="font-size: ${headerFontSize}; line-height: 1; color: ${cardBg}; margin: 0; text-align: center; letter-spacing: 2px; position: relative; z-index: 10; text-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            ${monthName}
          </h1>
       </div>
       <div style="flex: 1; width: 100%; background: ${cardBg}; position: relative; overflow: hidden; display: flex; align-items: flex-start; justify-content: center; padding: 20px 30px; box-sizing: border-box;">
          ${backgroundConfetti}
          ${flexContent}
       </div>
    </div>
  `;
};

// --- GENERIC LANDSCAPE RENDERER ---
const generateLandscapeTemplate = (
  employee: Employee, 
  config: CanvasConfig, 
  titleHtml: string, 
  titleSize: string = '54px',
  textAlign: 'left' | 'center' = 'left',
  letterSpacing: string = '4px',
  sphereVariant: 'portrait' | 'anniversary' | 'anniversary_landscape' | 'welcome' | 'farewell' | 'job_change' | 'none' = 'none',
  bottomLabel: string | null = null,
  showConfetti: boolean = true,
  purpleColor: string = '#9333ea', 
  nameBottomOffset: string | null = null, 
  customBackground: string | null = null 
) => {
  const cardBg = '#f1f1f1';
  const fadeColor = '#ffffff';
  const backgroundConfetti = showConfetti ? getBackgroundConfetti() : '';
  const noise = getNoiseOverlay();
  const spheres = sphereVariant !== 'none' ? getSpheresHtml(sphereVariant as any) : '';
  // Landscape logo: Top Left of the Left Panel - Reduced size
  const logo = getPepperLogoHtml('position: absolute; top: 15px; left: 15px; width: 20px; height: 28px; z-index: 60;');

  const scale = employee.photoScale || 1;
  const posX = employee.photoPosition?.x || 0;
  const posY = employee.photoPosition?.y || 0;
  
  const bottomTextHtml = bottomLabel !== null 
    ? bottomLabel 
    : employee.dateStr.toUpperCase().replace(/\s/g, '<br/>');

  const nameLen = employee.name.length;
  // Scientific text fitting based on canvas.measureText for precise size calculation
  let nameFontSize = '24px';
  const nameParts = employee.name.split(' ');
  const firstName = nameParts[0] || '';
  const restName = nameParts.slice(1).join(' ') || '';

  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let size = 24;
        const maxFrameW = sphereVariant === 'welcome' ? 220 : 175;
        while (size > 10) {
          ctx.font = `700 ${size}px 'Orkney', 'Inter', sans-serif`;
          const w1 = ctx.measureText(firstName).width;
          const w2 = ctx.measureText(restName).width;
          if (Math.max(w1, w2) <= maxFrameW) {
            break;
          }
          size -= 0.5;
        }
        nameFontSize = `${size}px`;
      }
    } catch (e) {
      console.warn("Scientific name fitting failed in generateLandscapeTemplate, fallback to char approximation", e);
    }
  } else {
    if (nameLen > 15) nameFontSize = '20px';
    if (nameLen > 22) nameFontSize = '18px';
    if (nameLen > 28) nameFontSize = '16px';
    if (nameLen > 35) nameFontSize = '14px';
  }

  const cleanLabel = bottomTextHtml.replace(/<[^>]*>?/gm, '');
  const maxLineLen = Math.max(firstName.length, restName.length);
  const collisionScore = maxLineLen + (cleanLabel.length * 0.6);
  const isLongName = nameLen > 16 || collisionScore > 12;
  const isLabelMultiline = cleanLabel.length > 35 || bottomTextHtml.includes('<br');
  
  const stackedBottomPos = isLabelMultiline ? '52px' : '35px';
  const defaultBottomPos = isLongName ? stackedBottomPos : '15px';
  const bottomPos = nameBottomOffset || defaultBottomPos;

  const nameContainerStyle = isLongName
     ? `position: absolute; bottom: ${bottomPos}; left: 15px; z-index: 10; text-align: left; width: 90%;`
     : `position: absolute; bottom: ${bottomPos}; left: 15px; z-index: 10; text-align: left; max-width: 65%;`;

  const labelContainerStyle = isLongName
     ? `position: absolute; bottom: 12px; left: 15px; z-index: 5; text-align: left;`
     : `position: absolute; bottom: 18px; right: 15px; z-index: 5; text-align: right;`;
     
  const labelFontSize = isLongName ? '12px' : '14px';
  const defaultLabelFontClass = sphereVariant === 'job_change' ? '' : 'akira-font';
  const labelStyleOverride = sphereVariant === 'job_change' 
    ? 'position: absolute; bottom: 0; left: 0; right: 0; z-index: 5;' 
    : labelContainerStyle;

  const gradientHeight = sphereVariant === 'job_change' ? '65%' : '50%';
  const defaultFrameBg = `linear-gradient(to bottom, ${fadeColor} 20%, rgba(255,255,255,0) 100%), linear-gradient(90deg, #22d3ee 0%, ${purpleColor} 100%)`;
  const frameBackground = customBackground || defaultFrameBg;
  const leftPanelGradient = `linear-gradient(to top, ${fadeColor} 0%, rgba(255,255,255,0) 80%), linear-gradient(135deg, ${purpleColor} 0%, #22d3ee 100%)`;
  const leftPanelJustify = 'center'; 
  const leftPanelPadding = '0 20px';

  const isJobChange = sphereVariant === 'job_change';

  return `
    <div id="capture-target" style="width: 740px; height: 360px; background: ${cardBg}; position: relative; display: flex; flex-direction: row; overflow: hidden; box-sizing: border-box;">
       <div style="width: 55%; height: 100%; background: ${leftPanelGradient}; position: relative; display: flex; align-items: center; justify-content: ${leftPanelJustify}; padding: ${leftPanelPadding}; box-sizing: border-box; overflow: hidden; z-index: 20;">
          ${noise}
          ${spheres}
          ${logo}
          ${backgroundConfetti}
          <h1 class="akira-font" style="font-size: ${titleSize}; line-height: 1; color: ${cardBg}; margin: 0; text-align: ${textAlign}; letter-spacing: ${letterSpacing}; position: relative; z-index: 10; white-space: normal; word-wrap: break-word; text-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            ${titleHtml}
          </h1>
       </div>
       <div style="width: 45%; height: 100%; position: relative; overflow: hidden; background: linear-gradient(135deg, #22d3ee 0%, ${purpleColor} 100%);">
          <img src="${employee.photoUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; object-position: top center; z-index: 5; transform: scale(${scale}) translate(${posX}px, ${posY}px); transform-origin: center center;" />
          <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: ${gradientHeight}; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%); z-index: 6; pointer-events: none;"></div>
          ${isJobChange ? `
            <div style="position: absolute; bottom: 89px; left: 20px; z-index: 10; max-width: 85%;">
              <p class="akira-font" style="font-size: ${nameFontSize}; color: #ffffff; margin: 0; line-height: 1; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                ${firstName}<br/>${restName}
              </p>
            </div>
            <div style="position: absolute; bottom: 0; left: 0; right: 0; z-index: 10;">
              ${bottomTextHtml}
            </div>
          ` : `
            <div style="position: absolute; bottom: 20px; left: 20px; z-index: 10; max-width: 85%;">
              <p class="akira-font" style="font-size: ${nameFontSize}; color: #ffffff; margin: 0; line-height: 1; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                ${firstName}<br/>${restName}
              </p>
              <p style="font-family: 'Orkney', sans-serif; font-size: 13px; font-weight: 300; color: rgba(255,255,255,0.85); margin: 6px 0 0 0; line-height: 1.1; text-shadow: 0 2px 10px rgba(0,0,0,0.5); text-transform: uppercase; letter-spacing: 0.5px;">
                ${employee.role}
              </p>
            </div>
          `}
       </div>
    </div>
  `;
};

// --- GENERIC PORTRAIT RENDERER ---
const generatePortraitTemplate = (
  employee: Employee, 
  config: CanvasConfig, 
  titleHtml: string, 
  titleSize: string = '64px',
  textAlign: 'left' | 'center' = 'left',
  letterSpacing: string = '4px',
  sphereVariant: 'portrait' | 'anniversary' | 'welcome' | 'farewell' | 'job_change' | 'none' = 'none',
  bottomLabel: string | null = null,
  showConfetti: boolean = true,
  purpleColor: string = '#9333ea', // Default purple
  nameBottomOffset: string | null = null, // Optional override for name bottom position
  customBackground: string | null = null // Optional override for photo background
) => {
  
  const cardBg = '#f1f1f1';
  const fadeColor = '#ffffff';
  const backgroundConfetti = showConfetti ? getBackgroundConfetti() : '';
  const noise = getNoiseOverlay();
  const spheres = sphereVariant !== 'none' ? getSpheresHtml(sphereVariant as any) : '';
  // Reduced logo size to be smaller (approx 20px width)
  const logo = getPepperLogoHtml('position: absolute; top: 15px; right: 15px; width: 20px; height: 28px; z-index: 60;');

  const justifyContent = textAlign === 'center' ? 'center' : 'flex-start';
  const paddingLeft = textAlign === 'center' ? '0' : '40px';
  
  const scale = employee.photoScale || 1;
  const posX = employee.photoPosition?.x || 0;
  const posY = employee.photoPosition?.y || 0;
  
  const bottomTextHtml = bottomLabel !== null 
    ? bottomLabel 
    : employee.dateStr.toUpperCase().replace(/\s/g, '<br/>');

  const nameLen = employee.name.length;
  // Scientific text fitting based on canvas.measureText for precise size calculation
  let nameFontSize = '24px';
  const nameParts = employee.name.split(' ');
  const firstName = nameParts[0] || '';
  const restName = nameParts.slice(1).join(' ') || '';

  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let size = 24;
        const maxFrameW = sphereVariant === 'welcome' ? 220 : 175;
        while (size > 10) {
          ctx.font = `700 ${size}px 'Orkney', 'Inter', sans-serif`;
          const w1 = ctx.measureText(firstName).width;
          const w2 = ctx.measureText(restName).width;
          if (Math.max(w1, w2) <= maxFrameW) {
            break;
          }
          size -= 0.5;
        }
        nameFontSize = `${size}px`;
      }
    } catch (e) {
      console.warn("Scientific name fitting failed in generatePortraitTemplate, fallback to char approximation", e);
    }
  } else {
    if (nameLen > 15) nameFontSize = '20px';
    if (nameLen > 22) nameFontSize = '18px';
    if (nameLen > 28) nameFontSize = '16px';
    if (nameLen > 35) nameFontSize = '14px';
  }

  const cleanLabel = bottomTextHtml.replace(/<[^>]*>?/gm, '');
  const maxLineLen = Math.max(firstName.length, restName.length);
  const collisionScore = maxLineLen + (cleanLabel.length * 0.6);
  const isLongName = nameLen > 16 || collisionScore > 12;
  const isLabelMultiline = cleanLabel.length > 35 || bottomTextHtml.includes('<br');
  const stackedBottomPos = isLabelMultiline ? '52px' : '35px';
  const defaultBottomPos = isLongName ? stackedBottomPos : '15px';
  const bottomPos = nameBottomOffset || defaultBottomPos;

  const nameContainerStyle = isLongName
     ? `position: absolute; bottom: ${bottomPos}; left: 15px; z-index: 10; text-align: left; width: 90%;`
     : `position: absolute; bottom: ${bottomPos}; left: 15px; z-index: 10; text-align: left; max-width: 65%;`;

  const labelContainerStyle = isLongName
     ? `position: absolute; bottom: 12px; left: 15px; z-index: 5; text-align: left;`
     : `position: absolute; bottom: 18px; right: 15px; z-index: 5; text-align: right;`;
     
  const labelFontSize = isLongName ? '12px' : '14px';
  const defaultLabelFontClass = sphereVariant === 'job_change' ? '' : 'akira-font';
  const labelStyleOverride = sphereVariant === 'job_change' 
    ? 'position: absolute; bottom: 0; left: 0; right: 0; z-index: 5;' 
    : labelContainerStyle;

  const gradientHeight = sphereVariant === 'job_change' ? '65%' : '50%';
  const defaultFrameBg = `linear-gradient(to bottom, ${fadeColor} 20%, rgba(255,255,255,0) 100%), linear-gradient(90deg, #22d3ee 0%, ${purpleColor} 100%)`;
  const frameBackground = customBackground || defaultFrameBg;

  const topPanelHeight = sphereVariant === 'welcome' ? '215px' : '190px';
  const frameSize = sphereVariant === 'welcome' ? '255px' : '280px';
  const h1Width = sphereVariant === 'welcome' ? 'width: 100%; display: flex; flex-direction: column; align-items: center;' : '';

  const isJobChange_p = sphereVariant === 'job_change';

  return `
    <div id="capture-target" style="width: 360px; height: 540px; background: ${cardBg}; position: relative; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;">
       <div style="height: ${topPanelHeight}; width: 100%; background: linear-gradient(to top, ${fadeColor} 0%, rgba(255,255,255,0) 80%), linear-gradient(90deg, ${purpleColor} 0%, #22d3ee 100%); position: relative; display: flex; align-items: center; justify-content: ${justifyContent}; padding-left: ${paddingLeft}; box-sizing: border-box; overflow: hidden; z-index: 20;">
          ${noise}
          ${spheres}
          ${logo}
          ${backgroundConfetti}
          <h1 class="akira-font" style="font-size: ${titleSize}; line-height: 1; color: ${cardBg}; margin: 0; text-align: ${textAlign}; letter-spacing: ${letterSpacing}; position: relative; z-index: 10; white-space: ${sphereVariant === 'welcome' ? 'normal' : 'nowrap'}; word-wrap: break-word; text-shadow: 0 4px 12px rgba(0,0,0,0.1); ${h1Width}">
            ${titleHtml}
          </h1>
       </div>
       <div style="flex: 1; width: 100%; position: relative; overflow: hidden; background: linear-gradient(135deg, #22d3ee 0%, ${purpleColor} 100%);">
          <img src="${employee.photoUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; object-position: top center; z-index: 5; transform: scale(${scale}) translate(${posX}px, ${posY}px); transform-origin: center center;" />
          <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: ${gradientHeight}; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%); z-index: 6; pointer-events: none;"></div>
          ${isJobChange_p ? `
            <div style="position: absolute; bottom: 89px; left: 20px; z-index: 10; max-width: 85%;">
              <p class="akira-font" style="font-size: ${nameFontSize}; color: #ffffff; margin: 0; line-height: 1; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                ${firstName}<br/>${restName}
              </p>
            </div>
            <div style="position: absolute; bottom: 0; left: 0; right: 0; z-index: 10;">
              ${bottomTextHtml}
            </div>
          ` : `
            <div style="position: absolute; bottom: 20px; left: 20px; z-index: 10; max-width: 85%;">
              <p class="akira-font" style="font-size: ${nameFontSize}; color: #ffffff; margin: 0; line-height: 1; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                ${firstName}<br/>${restName}
              </p>
              <p style="font-family: 'Orkney', sans-serif; font-size: 13px; font-weight: 300; color: rgba(255,255,255,0.85); margin: 6px 0 0 0; line-height: 1.1; text-shadow: 0 2px 10px rgba(0,0,0,0.5); text-transform: uppercase; letter-spacing: 0.5px;">
                ${employee.role}
              </p>
            </div>
          `}
       </div>
    </div>
  `;
};

// --- BIRTHDAY / ANNIVERSARY / JOB CHANGE / FAREWELL — WELCOME-STYLE LAYOUT ---
// Plain left panel with big gradient-clipped title, full-bleed photo on the right with spheres + confetti.
// One shared title size across all four of these templates (not just within a single
// card) so they read as one consistent family — a template with an unusually wide
// title just shrinks that one card rather than the whole set growing/shrinking together.
const UNIFIED_TITLE_SIZE = 112;
const generateBirthdayCardTemplate = (
  employee: Employee,
  _config: CanvasConfig,
  language: Language,
  orientation: Orientation,
  variant: 'light' | 'dark' = 'light'
): string => {
  const isDark = variant === 'dark';
  const isLandscape = orientation === 'landscape';
  const cardWidth = isLandscape ? 740 : 360;
  const cardHeight = isLandscape ? 360 : 540;
  const cardBg = isDark ? '#1a1a1a' : '#f1f1f1';
  const purpleColor = '#594C99';
  const noise = getNoiseOverlay();
  const spheres = getSpheresHtml('brand');
  const backgroundConfetti = getBackgroundConfetti();
  const logo = getPepperLogoHtml('position: absolute; top: 15px; right: 15px; width: 20px; height: 28px; z-index: 60;', true);

  const scale = employee.photoScale || 1;
  const posX = employee.photoPosition?.x || 0;
  const posY = employee.photoPosition?.y || 0;
  const firstName = employee.name.split(' ')[0] || '';
  const restName = employee.name.split(' ').slice(1).join(' ') || '';

  const rawTitle = TEXTS.BIRTHDAY[language]; // may contain <br/>
  const titleLines = rawTitle.split('<br/>');
  const line1 = titleLines[0] || '';
  const line2 = titleLines[1] || '';

  const letterSpacingEm = -0.02;
  const textPanelWidth = isLandscape ? cardWidth * 0.55 : cardWidth;
  const textAvailW = textPanelWidth - 80; // 40px left/right padding
  // Fit each line edge-to-edge, then back off a bit so the title doesn't touch the panel edges.
  const SIZE_EASE = 0.94;

  const fitLine = (text: string, maxW: number): number => {
    if (!text || typeof document === 'undefined') return 60;
    try {
      const cv = document.createElement('canvas');
      const cx = cv.getContext('2d') as any;
      if (!cx) return 60;
      let sz = 90;
      cx.font = `700 ${sz}px 'Orkney', 'Inter', sans-serif`;
      cx.letterSpacing = `${sz * letterSpacingEm}px`;
      sz = sz * (maxW / cx.measureText(text).width);
      cx.font = `700 ${sz}px 'Orkney', 'Inter', sans-serif`;
      cx.letterSpacing = `${sz * letterSpacingEm}px`;
      sz = sz * (maxW / cx.measureText(text).width);
      return sz * SIZE_EASE;
    } catch { return 60; }
  };

  // Same size for both lines (the tighter-fitting line wins), left-aligned —
  // matches the "NOVO / CARGO" treatment requested for these templates.
  const sharedSize = Math.min(UNIFIED_TITLE_SIZE, fitLine(line1, textAvailW), line2 ? fitLine(line2, textAvailW) : Infinity);
  const sz1 = sharedSize;
  const sz2 = sharedSize;

  const gradLine = (text: string, sz: number, tight: boolean = false) => {
    // line-height stays >= 1 so ascenders/cap-height never get clipped by the
    // panel's overflow:hidden; the tight visual gap between lines comes from a
    // negative margin on the second line instead of shrinking the line box itself.
    const lineH = Math.round(sz * 1.05);
    const marginTop = tight ? `${-Math.round(sz * 0.2)}px` : '0';
    return `<div style="width: 100%; padding: 0 40px; box-sizing: border-box; overflow: visible; margin-top: ${marginTop};">
      <h1 class="akira-font" style="font-size: ${sz}px; line-height: ${lineH}px; margin: 0; text-align: left; letter-spacing: ${letterSpacingEm}em; white-space: nowrap; background: linear-gradient(90deg, #22d3ee 0%, ${purpleColor} 100%); -webkit-background-clip: text; background-clip: text; color: transparent;">${text}</h1>
    </div>`;
  };

  // Name font sizing
  const maxNameW = isLandscape ? (cardWidth * 0.45) - 40 : cardWidth - 40;
  let nameFontSizeNum = 28;
  if (typeof document !== 'undefined') {
    try {
      const cv = document.createElement('canvas');
      const cx = cv.getContext('2d');
      if (cx) {
        let sz = 32;
        while (sz > 12) {
          cx.font = `700 ${sz}px 'Orkney', 'Inter', sans-serif`;
          if (Math.max(cx.measureText(firstName).width, cx.measureText(restName).width) <= maxNameW) break;
          sz -= 0.5;
        }
        nameFontSizeNum = sz;
      }
    } catch { /**/ }
  }
  const nameFontSize = `${nameFontSizeNum}px`;

  const photoPanel = `
    <img src="${employee.photoUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; object-position: top center; z-index: 5; transform: scale(${scale}) translate(${posX}px, ${posY}px); transform-origin: center center;" />
    ${noise}
    ${spheres}
    ${backgroundConfetti}
    ${logo}
    <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 55%; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%); z-index: 6; pointer-events: none;"></div>
    <div style="position: absolute; bottom: 20px; left: 20px; z-index: 10; max-width: 85%;">
      <p class="akira-font" style="font-size: ${nameFontSize}; color: #ffffff; margin: 0; line-height: 1; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
        ${firstName}<br/>${restName}
      </p>
      <p style="font-family: 'Orkney', sans-serif; font-size: 13px; font-weight: 300; color: rgba(255,255,255,0.85); margin: 6px 0 0 0; line-height: 1.1; text-shadow: 0 2px 10px rgba(0,0,0,0.5); text-transform: uppercase; letter-spacing: 0.5px;">
        ${employee.role}
      </p>
    </div>
  `;

  if (isLandscape) {
    return `
      <div id="capture-target" style="width: ${cardWidth}px; height: ${cardHeight}px; background: ${cardBg}; position: relative; display: flex; flex-direction: row; overflow: hidden; box-sizing: border-box;">
        <div style="width: 55%; height: 100%; background: ${cardBg}; position: relative; display: flex; flex-direction: column; align-items: stretch; justify-content: flex-end; gap: 0px; padding-bottom: 20px; box-sizing: border-box; overflow: hidden;">
          ${gradLine(line1, sz1)}
          ${line2 ? gradLine(line2, sz2, true) : ''}
        </div>
        <div style="width: 45%; height: 100%; position: relative; overflow: hidden; background: linear-gradient(135deg, #22d3ee 0%, ${purpleColor} 100%);">
          ${photoPanel}
        </div>
      </div>
    `;
  } else {
    const topH = Math.round(line2 ? sz1 * 1.9 : sz1 * 1.05) + 40;
    return `
      <div id="capture-target" style="width: ${cardWidth}px; height: ${cardHeight}px; background: ${cardBg}; position: relative; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;">
        <div style="height: ${topH}px; width: 100%; background: ${cardBg}; position: relative; display: flex; flex-direction: column; align-items: stretch; justify-content: flex-end; gap: 0px; padding-bottom: 24px; box-sizing: border-box; overflow: hidden;">
          ${gradLine(line1, sz1)}
          ${line2 ? gradLine(line2, sz2, true) : ''}
        </div>
        <div style="flex: 1; width: 100%; position: relative; overflow: hidden; background: linear-gradient(135deg, #22d3ee 0%, ${purpleColor} 100%);">
          ${photoPanel}
        </div>
      </div>
    `;
  }
};

const generateAnniversaryCardTemplate = (
  employee: Employee,
  _config: CanvasConfig,
  language: Language,
  orientation: Orientation,
  variant: 'light' | 'dark' = 'light'
): string => {
  const isDark = variant === 'dark';
  const isLandscape = orientation === 'landscape';
  const cardWidth = isLandscape ? 740 : 360;
  const cardHeight = isLandscape ? 360 : 540;
  const cardBg = isDark ? '#1a1a1a' : '#f1f1f1';
  const purpleColor = '#594C99';
  const noise = getNoiseOverlay();
  const spheres = getSpheresHtml('brand');
  const backgroundConfetti = getBackgroundConfetti();
  const logo = getPepperLogoHtml('position: absolute; top: 15px; right: 15px; width: 20px; height: 28px; z-index: 60;', true);

  const scale = employee.photoScale || 1;
  const posX = employee.photoPosition?.x || 0;
  const posY = employee.photoPosition?.y || 0;
  const firstName = employee.name.split(' ')[0] || '';
  const restName = employee.name.split(' ').slice(1).join(' ') || '';

  const tenureText = formatTenure(employee.tenure || '1 ANO', language).toUpperCase();
  // Split into number and label for two separate lines
  const parts = tenureText.split(' ');
  const numPart = parts[0] || tenureText; // e.g. "5"
  const labelPart = parts.slice(1).join(' ') || ''; // e.g. "ANOS"

  const letterSpacingEm = -0.02;
  const textPanelWidth = isLandscape ? cardWidth * 0.55 : cardWidth;
  const textAvailW = textPanelWidth - 80; // 40px left/right padding
  // Fit each line edge-to-edge, then back off a bit so the title doesn't touch the panel edges.
  const SIZE_EASE = 0.94;

  const fitLine = (text: string, maxW: number): number => {
    if (!text || typeof document === 'undefined') return 60;
    try {
      const cv = document.createElement('canvas');
      const cx = cv.getContext('2d') as any;
      if (!cx) return 60;
      let sz = 90;
      cx.font = `700 ${sz}px 'Orkney', 'Inter', sans-serif`;
      cx.letterSpacing = `${sz * letterSpacingEm}px`;
      sz = sz * (maxW / cx.measureText(text).width);
      cx.font = `700 ${sz}px 'Orkney', 'Inter', sans-serif`;
      cx.letterSpacing = `${sz * letterSpacingEm}px`;
      sz = sz * (maxW / cx.measureText(text).width);
      return Math.min(sz * SIZE_EASE, 150); // cap very large numbers (e.g. "1" would be enormous)
    } catch { return 60; }
  };

  // Same size for both lines (the tighter-fitting line wins), left-aligned.
  let sharedSize = Math.min(UNIFIED_TITLE_SIZE, fitLine(numPart, textAvailW), labelPart ? fitLine(labelPart, textAvailW) : Infinity);

  // Ensure both lines fit vertically in landscape (available ~290px after padding/label)
  if (isLandscape) {
    const maxTotal = cardHeight - 80; // 280px available
    const totalH = sharedSize * 1.05 * (labelPart ? 2 : 1) + 8;
    if (totalH > maxTotal) {
      sharedSize = sharedSize * (maxTotal / totalH);
    }
  }
  const szNum = sharedSize;
  const szLabel = sharedSize;

  const gradLine = (text: string, sz: number, tight: boolean = false) => {
    // line-height stays >= 1 so ascenders/cap-height never get clipped by the
    // panel's overflow:hidden; the tight visual gap between lines comes from a
    // negative margin on the second line instead of shrinking the line box itself.
    const lineH = Math.round(sz * 1.05);
    const marginTop = tight ? `${-Math.round(sz * 0.2)}px` : '0';
    return `<div style="width: 100%; padding: 0 40px; box-sizing: border-box; overflow: visible; margin-top: ${marginTop};">
      <h1 class="akira-font" style="font-size: ${sz}px; line-height: ${lineH}px; margin: 0; text-align: left; letter-spacing: ${letterSpacingEm}em; white-space: nowrap; background: linear-gradient(90deg, #22d3ee 0%, ${purpleColor} 100%); -webkit-background-clip: text; background-clip: text; color: transparent;">${text}</h1>
    </div>`;
  };

  // Name font sizing
  const maxNameW = isLandscape ? (cardWidth * 0.45) - 40 : cardWidth - 40;
  let nameFontSizeNum = 28;
  if (typeof document !== 'undefined') {
    try {
      const cv = document.createElement('canvas');
      const cx = cv.getContext('2d');
      if (cx) {
        let sz = 32;
        while (sz > 12) {
          cx.font = `700 ${sz}px 'Orkney', 'Inter', sans-serif`;
          if (Math.max(cx.measureText(firstName).width, cx.measureText(restName).width) <= maxNameW) break;
          sz -= 0.5;
        }
        nameFontSizeNum = sz;
      }
    } catch { /**/ }
  }
  const nameFontSize = `${nameFontSizeNum}px`;

  const photoPanel = `
    <img src="${employee.photoUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; object-position: top center; z-index: 5; transform: scale(${scale}) translate(${posX}px, ${posY}px); transform-origin: center center;" />
    ${noise}
    ${spheres}
    ${backgroundConfetti}
    ${logo}
    <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 55%; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%); z-index: 6; pointer-events: none;"></div>
    <div style="position: absolute; bottom: 20px; left: 20px; z-index: 10; max-width: 85%;">
      <p class="akira-font" style="font-size: ${nameFontSize}; color: #ffffff; margin: 0; line-height: 1; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
        ${firstName}<br/>${restName}
      </p>
      <p style="font-family: 'Orkney', sans-serif; font-size: 13px; font-weight: 300; color: rgba(255,255,255,0.85); margin: 6px 0 0 0; line-height: 1.1; text-shadow: 0 2px 10px rgba(0,0,0,0.5); text-transform: uppercase; letter-spacing: 0.5px;">
        ${employee.role}
      </p>
    </div>
  `;

  if (isLandscape) {
    return `
      <div id="capture-target" style="width: ${cardWidth}px; height: ${cardHeight}px; background: ${cardBg}; position: relative; display: flex; flex-direction: row; overflow: hidden; box-sizing: border-box;">
        <div style="width: 55%; height: 100%; background: ${cardBg}; position: relative; display: flex; flex-direction: column; align-items: stretch; justify-content: flex-end; gap: 0px; padding-bottom: 20px; box-sizing: border-box; overflow: hidden;">
          ${gradLine(numPart, szNum)}
          ${labelPart ? gradLine(labelPart, szLabel, true) : ''}
        </div>
        <div style="width: 45%; height: 100%; position: relative; overflow: hidden; background: linear-gradient(135deg, #22d3ee 0%, ${purpleColor} 100%);">
          ${photoPanel}
        </div>
      </div>
    `;
  } else {
    const topH = Math.round(labelPart ? szNum * 1.9 : szNum * 1.05) + 40;
    return `
      <div id="capture-target" style="width: ${cardWidth}px; height: ${cardHeight}px; background: ${cardBg}; position: relative; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;">
        <div style="height: ${topH}px; width: 100%; background: ${cardBg}; position: relative; display: flex; flex-direction: column; align-items: stretch; justify-content: flex-end; gap: 0px; padding-bottom: 24px; box-sizing: border-box; overflow: hidden;">
          ${gradLine(numPart, szNum)}
          ${labelPart ? gradLine(labelPart, szLabel, true) : ''}
        </div>
        <div style="flex: 1; width: 100%; position: relative; overflow: hidden; background: linear-gradient(135deg, #22d3ee 0%, ${purpleColor} 100%);">
          ${photoPanel}
        </div>
      </div>
    `;
  }
};

// --- JOB CHANGE — WELCOME-STYLE LAYOUT ---
const generateJobChangeCardTemplate = (
  employee: Employee,
  _config: CanvasConfig,
  language: Language,
  orientation: Orientation,
  variant: 'light' | 'dark' = 'light'
): string => {
  const isDark = variant === 'dark';
  const isLandscape = orientation === 'landscape';
  const cardWidth = isLandscape ? 740 : 360;
  const cardHeight = isLandscape ? 360 : 540;
  const cardBg = isDark ? '#1a1a1a' : '#f1f1f1';
  const purpleColor = '#594C99';
  const noise = getNoiseOverlay();
  const spheres = getSpheresHtml('brand');
  const logo = getPepperLogoHtml('position: absolute; top: 15px; right: 15px; width: 20px; height: 28px; z-index: 60;', true);

  const scale = employee.photoScale || 1;
  const posX = employee.photoPosition?.x || 0;
  const posY = employee.photoPosition?.y || 0;
  const firstName = employee.name.split(' ')[0] || '';
  const restName = employee.name.split(' ').slice(1).join(' ') || '';

  const rawTitle = TEXTS.NEW_ROLE[language]; // may contain <br/>
  const titleLines = rawTitle.split('<br/>');
  const line1 = titleLines[0] || '';
  const line2 = titleLines[1] || '';

  const letterSpacingEm = -0.02;
  const textPanelWidth = isLandscape ? cardWidth * 0.55 : cardWidth;
  const textAvailW = textPanelWidth - 80; // 40px left/right padding
  const SIZE_EASE = 0.94;

  const fitLine = (text: string, maxW: number): number => {
    if (!text || typeof document === 'undefined') return 60;
    try {
      const cv = document.createElement('canvas');
      const cx = cv.getContext('2d') as any;
      if (!cx) return 60;
      let sz = 90;
      cx.font = `700 ${sz}px 'Orkney', 'Inter', sans-serif`;
      cx.letterSpacing = `${sz * letterSpacingEm}px`;
      sz = sz * (maxW / cx.measureText(text).width);
      cx.font = `700 ${sz}px 'Orkney', 'Inter', sans-serif`;
      cx.letterSpacing = `${sz * letterSpacingEm}px`;
      sz = sz * (maxW / cx.measureText(text).width);
      return sz * SIZE_EASE;
    } catch { return 60; }
  };

  // Same size for both lines (the tighter-fitting line wins), left-aligned.
  const sharedSize = Math.min(UNIFIED_TITLE_SIZE, fitLine(line1, textAvailW), line2 ? fitLine(line2, textAvailW) : Infinity);
  const sz1 = sharedSize;
  const sz2 = sharedSize;

  const gradLine = (text: string, sz: number, tight: boolean = false) => {
    // line-height stays >= 1 so ascenders/cap-height never get clipped by the
    // panel's overflow:hidden; the tight visual gap between lines comes from a
    // negative margin on the second line instead of shrinking the line box itself.
    const lineH = Math.round(sz * 1.05);
    const marginTop = tight ? `${-Math.round(sz * 0.2)}px` : '0';
    return `<div style="width: 100%; padding: 0 40px; box-sizing: border-box; overflow: visible; margin-top: ${marginTop};">
      <h1 class="akira-font" style="font-size: ${sz}px; line-height: ${lineH}px; margin: 0; text-align: left; letter-spacing: ${letterSpacingEm}em; white-space: nowrap; background: linear-gradient(90deg, #22d3ee 0%, ${purpleColor} 100%); -webkit-background-clip: text; background-clip: text; color: transparent;">${text}</h1>
    </div>`;
  };

  // Name font sizing
  const maxNameW = isLandscape ? (cardWidth * 0.45) - 40 : cardWidth - 40;
  let nameFontSizeNum = 28;
  if (typeof document !== 'undefined') {
    try {
      const cv = document.createElement('canvas');
      const cx = cv.getContext('2d');
      if (cx) {
        let sz = 32;
        while (sz > 12) {
          cx.font = `700 ${sz}px 'Orkney', 'Inter', sans-serif`;
          if (Math.max(cx.measureText(firstName).width, cx.measureText(restName).width) <= maxNameW) break;
          sz -= 0.5;
        }
        nameFontSizeNum = sz;
      }
    } catch { /**/ }
  }
  const nameFontSize = `${nameFontSizeNum}px`;

  const prevRole = employee.previousRole ? employee.previousRole.toUpperCase() : TEXTS.PREVIOUS_ROLE_LABEL[language];
  const newRole = employee.role.toUpperCase();

  const ARROW_UP_SVG = `<svg width="18" height="18" viewBox="0 0 270 270" fill="none" xmlns="http://www.w3.org/2000/svg"><g transform="translate(41, 41) rotate(45 94.1 94.2)"><polygon points="165.23 0 165.23 50.7 87.09 50.7 188.21 152.7 152.4 188.48 50.7 87.09 50.7 165.23 0 165.23 0 0 165.23 0" fill="#ffffff"/></g></svg>`;
  const ARROW_DOWN_SVG = `<svg width="16" height="16" viewBox="0 0 270 270" fill="none" xmlns="http://www.w3.org/2000/svg"><g transform="translate(41, 41) rotate(225 94.1 94.2)"><polygon points="165.23 0 165.23 50.7 87.09 50.7 188.21 152.7 152.4 188.48 50.7 87.09 50.7 165.23 0 165.23 0 0 165.23 0" fill="#ffffff"/></g></svg>`;

  let newRoleFontSize = '18px';
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let size = 18;
        const maxW = (cardWidth * 0.45) - 90;
        while (size > 9) {
          ctx.font = `400 ${size}px 'Orkney', 'Inter', sans-serif`;
          if (ctx.measureText(newRole).width <= maxW) break;
          size -= 0.5;
        }
        newRoleFontSize = `${size}px`;
      }
    } catch { /**/ }
  }

  const changeLabelHtml = `
    <div style="display: flex; flex-direction: column; width: 100%;">
        <div style="height: 50px; background: linear-gradient(90deg, #22c55e 0%, #15803d 100%); display: flex; align-items: center; justify-content: space-between; padding: 0 20px;">
            <span style="font-family: 'Orkney', sans-serif; color: white; font-size: ${newRoleFontSize}; font-weight: 400; letter-spacing: 0.5px; line-height: 1.2; flex: 1; min-width: 0; margin-right: 15px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word;">${newRole}</span>
            <div style="display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${ARROW_UP_SVG}</div>
        </div>
        <div style="height: 35px; background: linear-gradient(90deg, #450a0a 0%, #7f1d1d 100%); display: flex; align-items: center; justify-content: space-between; padding: 0 20px;">
             <div style="display: flex; align-items: center; gap: 8px; opacity: 0.8; flex: 1; min-width: 0;">
                <span style="font-family: 'Orkney', sans-serif; color: white; font-size: 12px; font-weight: 300; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${prevRole}</span>
             </div>
             <div style="opacity: 0.8; transform: scale(0.9); flex-shrink: 0;">${ARROW_DOWN_SVG}</div>
        </div>
    </div>
  `;

  const photoPanel = `
    <img src="${employee.photoUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; object-position: top center; z-index: 5; transform: scale(${scale}) translate(${posX}px, ${posY}px); transform-origin: center center;" />
    ${noise}
    ${spheres}
    ${logo}
    <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 65%; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%); z-index: 6; pointer-events: none;"></div>
    <div style="position: absolute; bottom: 89px; left: 20px; z-index: 10; max-width: 85%;">
      <p class="akira-font" style="font-size: ${nameFontSize}; color: #ffffff; margin: 0; line-height: 1; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
        ${firstName}<br/>${restName}
      </p>
    </div>
    <div style="position: absolute; bottom: 0; left: 0; right: 0; z-index: 10;">
      ${changeLabelHtml}
    </div>
  `;

  if (isLandscape) {
    return `
      <div id="capture-target" style="width: ${cardWidth}px; height: ${cardHeight}px; background: ${cardBg}; position: relative; display: flex; flex-direction: row; overflow: hidden; box-sizing: border-box;">
        <div style="width: 55%; height: 100%; background: ${cardBg}; position: relative; display: flex; flex-direction: column; align-items: stretch; justify-content: flex-end; gap: 0px; padding-bottom: 20px; box-sizing: border-box; overflow: hidden;">
          ${gradLine(line1, sz1)}
          ${line2 ? gradLine(line2, sz2, true) : ''}
        </div>
        <div style="width: 45%; height: 100%; position: relative; overflow: hidden; background: linear-gradient(135deg, #22d3ee 0%, ${purpleColor} 100%);">
          ${photoPanel}
        </div>
      </div>
    `;
  } else {
    const topH = Math.round(line2 ? sz1 * 1.9 : sz1 * 1.05) + 40;
    return `
      <div id="capture-target" style="width: ${cardWidth}px; height: ${cardHeight}px; background: ${cardBg}; position: relative; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;">
        <div style="height: ${topH}px; width: 100%; background: ${cardBg}; position: relative; display: flex; flex-direction: column; align-items: stretch; justify-content: flex-end; gap: 0px; padding-bottom: 24px; box-sizing: border-box; overflow: hidden;">
          ${gradLine(line1, sz1)}
          ${line2 ? gradLine(line2, sz2, true) : ''}
        </div>
        <div style="flex: 1; width: 100%; position: relative; overflow: hidden; background: linear-gradient(135deg, #22d3ee 0%, ${purpleColor} 100%);">
          ${photoPanel}
        </div>
      </div>
    `;
  }
};

// --- SEE YOU SOON (FAREWELL) — WELCOME-STYLE LAYOUT ---
const generateFarewellCardTemplate = (
  employee: Employee,
  _config: CanvasConfig,
  language: Language,
  orientation: Orientation,
  variant: 'light' | 'dark' = 'light'
): string => {
  const isDark = variant === 'dark';
  const isLandscape = orientation === 'landscape';
  const cardWidth = isLandscape ? 740 : 360;
  const cardHeight = isLandscape ? 360 : 540;
  const cardBg = isDark ? '#1a1a1a' : '#f1f1f1';
  const purpleColor = '#594C99';
  const noise = getNoiseOverlay();
  const spheres = getSpheresHtml('brand');
  const logo = getPepperLogoHtml('position: absolute; top: 15px; right: 15px; width: 20px; height: 28px; z-index: 60;', true);

  const scale = employee.photoScale || 1;
  const posX = employee.photoPosition?.x || 0;
  const posY = employee.photoPosition?.y || 0;
  const firstName = employee.name.split(' ')[0] || '';
  const restName = employee.name.split(' ').slice(1).join(' ') || '';

  const rawTitle = TEXTS.FAREWELL[language]; // may contain <br/>
  const titleLines = rawTitle.split('<br/>');
  const line1 = titleLines[0] || '';
  const line2 = titleLines[1] || '';

  const letterSpacingEm = -0.02;
  const textPanelWidth = isLandscape ? cardWidth * 0.55 : cardWidth;
  const textAvailW = textPanelWidth - 80; // 40px left/right padding
  const SIZE_EASE = 0.94;

  const fitLine = (text: string, maxW: number): number => {
    if (!text || typeof document === 'undefined') return 60;
    try {
      const cv = document.createElement('canvas');
      const cx = cv.getContext('2d') as any;
      if (!cx) return 60;
      let sz = 90;
      cx.font = `700 ${sz}px 'Orkney', 'Inter', sans-serif`;
      cx.letterSpacing = `${sz * letterSpacingEm}px`;
      sz = sz * (maxW / cx.measureText(text).width);
      cx.font = `700 ${sz}px 'Orkney', 'Inter', sans-serif`;
      cx.letterSpacing = `${sz * letterSpacingEm}px`;
      sz = sz * (maxW / cx.measureText(text).width);
      return Math.min(sz * SIZE_EASE, 120);
    } catch { return 60; }
  };

  // Same size for both lines (the tighter-fitting line wins), left-aligned.
  const sharedSize = Math.min(UNIFIED_TITLE_SIZE, fitLine(line1, textAvailW), line2 ? fitLine(line2, textAvailW) : Infinity);
  const sz1 = sharedSize;
  const sz2 = sharedSize;

  const gradLine = (text: string, sz: number, tight: boolean = false) => {
    // Extra room (1.35x) so accented capitals (Á, É, ¡) aren't clipped, since
    // accent marks sit above cap-height. 1.15x still let the top of the
    // accent poke outside the gradient's painted box on some letters (e.g.
    // "ATÉ"), since -webkit-background-clip:text only paints within the
    // line box.
    const lineH = Math.round(sz * 1.35);
    const marginTop = tight ? `${-Math.round(sz * 0.2)}px` : '0';
    return `<div style="width: 100%; padding: 0 40px; box-sizing: border-box; overflow: visible; margin-top: ${marginTop};">
      <h1 class="akira-font" style="font-size: ${sz}px; line-height: ${lineH}px; margin: 0; text-align: left; letter-spacing: ${letterSpacingEm}em; white-space: nowrap; background: linear-gradient(90deg, #22d3ee 0%, ${purpleColor} 100%); -webkit-background-clip: text; background-clip: text; color: transparent;">${text}</h1>
    </div>`;
  };

  // Name font sizing
  const maxNameW = isLandscape ? (cardWidth * 0.45) - 40 : cardWidth - 40;
  let nameFontSizeNum = 28;
  if (typeof document !== 'undefined') {
    try {
      const cv = document.createElement('canvas');
      const cx = cv.getContext('2d');
      if (cx) {
        let sz = 32;
        while (sz > 12) {
          cx.font = `700 ${sz}px 'Orkney', 'Inter', sans-serif`;
          if (Math.max(cx.measureText(firstName).width, cx.measureText(restName).width) <= maxNameW) break;
          sz -= 0.5;
        }
        nameFontSizeNum = sz;
      }
    } catch { /**/ }
  }
  const nameFontSize = `${nameFontSizeNum}px`;

  const photoPanel = `
    <img src="${employee.photoUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; object-position: top center; z-index: 5; transform: scale(${scale}) translate(${posX}px, ${posY}px); transform-origin: center center;" />
    ${noise}
    ${spheres}
    ${logo}
    <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 55%; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%); z-index: 6; pointer-events: none;"></div>
    <div style="position: absolute; bottom: 20px; left: 20px; z-index: 10; max-width: 85%;">
      <p class="akira-font" style="font-size: ${nameFontSize}; color: #ffffff; margin: 0; line-height: 1; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
        ${firstName}<br/>${restName}
      </p>
      <p style="font-family: 'Orkney', sans-serif; font-size: 13px; font-weight: 300; color: rgba(255,255,255,0.85); margin: 6px 0 0 0; line-height: 1.1; text-shadow: 0 2px 10px rgba(0,0,0,0.5); text-transform: uppercase; letter-spacing: 0.5px;">
        ${employee.role}
      </p>
    </div>
  `;

  if (isLandscape) {
    return `
      <div id="capture-target" style="width: ${cardWidth}px; height: ${cardHeight}px; background: ${cardBg}; position: relative; display: flex; flex-direction: row; overflow: hidden; box-sizing: border-box;">
        <div style="width: 55%; height: 100%; background: ${cardBg}; position: relative; display: flex; flex-direction: column; align-items: stretch; justify-content: flex-end; gap: 0px; padding-bottom: 20px; box-sizing: border-box; overflow: hidden;">
          ${gradLine(line1, sz1)}
          ${line2 ? gradLine(line2, sz2, true) : ''}
        </div>
        <div style="width: 45%; height: 100%; position: relative; overflow: hidden; background: linear-gradient(135deg, #22d3ee 0%, ${purpleColor} 100%);">
          ${photoPanel}
        </div>
      </div>
    `;
  } else {
    // Matches gradLine's own box math: line1 is 1.35x, line2 (tight) adds
    // another 1.35x minus its -0.2x pull-up, so two lines net ~2.5x.
    const topH = Math.round(line2 ? sz1 * 2.5 : sz1 * 1.35) + 40;
    return `
      <div id="capture-target" style="width: ${cardWidth}px; height: ${cardHeight}px; background: ${cardBg}; position: relative; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;">
        <div style="height: ${topH}px; width: 100%; background: ${cardBg}; position: relative; display: flex; flex-direction: column; align-items: stretch; justify-content: flex-end; gap: 0px; padding-bottom: 24px; box-sizing: border-box; overflow: hidden;">
          ${gradLine(line1, sz1)}
          ${line2 ? gradLine(line2, sz2, true) : ''}
        </div>
        <div style="flex: 1; width: 100%; position: relative; overflow: hidden; background: linear-gradient(135deg, #22d3ee 0%, ${purpleColor} 100%);">
          ${photoPanel}
        </div>
      </div>
    `;
  }
};

// --- WELCOME ABOARD — ALTERNATE "INVERTED FRAME" LAYOUT ---
// Experimental variant requested to test a different composition: the
// gradient/sphere identity panel and the photo panel swap roles. The photo
// panel becomes the full-bleed gradient+sphere frame (instead of a small
// centered circle inside a plain panel), and the WELCOME title becomes
// gradient-clipped text sitting on the plain panel (instead of solid-color
// text on the gradient panel). Kept as its own function so the shared
// generateLandscapeTemplate/generatePortraitTemplate renderers (used by
// several other templates) are untouched.
const generateWelcomeTemplate = (
  employee: Employee,
  config: CanvasConfig,
  language: Language,
  variant: 'light' | 'dark' = 'light'
): string => {
  const isDark = variant === 'dark';
  const cardWidth = 740;
  const cardHeight = 360;
  const textPanelWidth = cardWidth * 0.55; // 407px, the section the title must exactly span edge-to-edge
  const cardBg = isDark ? '#1a1a1a' : '#f1f1f1';
  const descColor = isDark ? '#ffffff' : '#4b4b4b';
  const eyebrowColor = isDark ? '#ffffff' : '#1a1a1a';
  const purpleColor = '#594C99';
  const noise = getNoiseOverlay();
  const spheres = getSpheresHtml('welcome');
  const logo = getPepperLogoHtml('position: absolute; top: 15px; right: 15px; width: 20px; height: 28px; z-index: 60;', true);

  const scale = employee.photoScale || 1;
  const posX = employee.photoPosition?.x || 0;
  const posY = employee.photoPosition?.y || 0;

  const roleLabel = (employee.role || '').toUpperCase();
  const firstName = employee.name.split(' ')[0] || '';
  const restName = employee.name.split(' ').slice(1).join(' ') || '';

  // Name font sizing: same scientific canvas-measurement approach used by the
  // shared renderers, just against the larger full-bleed panel width (this
  // panel is now much bigger than the old 260px circular frame).
  const maxFrameW = (cardWidth * 0.45) - 40;
  let nameFontSize = '28px';
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let size = 32;
        while (size > 12) {
          ctx.font = `700 ${size}px 'Orkney', 'Inter', sans-serif`;
          const w1 = ctx.measureText(firstName).width;
          const w2 = ctx.measureText(restName).width;
          if (Math.max(w1, w2) <= maxFrameW) break;
          size -= 0.5;
        }
        nameFontSize = `${size}px`;
      }
    } catch (e) {
      console.warn("Name fitting failed in generateWelcomeTemplate", e);
    }
  }

  // Slightly tighter line-height than a normal paragraph default.
  const descFontSize = '17px';
  const maxDescHeight = 150;

  const eyebrowHtml = employee.description
    ? `<div class="akira-font" style="font-size: 11px; font-weight: 400; letter-spacing: 0.5px; color: ${eyebrowColor}; opacity: 0.5; margin: 0 0 6px 0; user-select: none; pointer-events: none;">Resumo sobre ${firstName || 'você'}</div>`
    : '';

  const descHtml = employee.description
    ? `<div style="margin-top: 16px; max-width: 320px;" onmousedown="event.stopPropagation();">
         ${eyebrowHtml}
         <div contenteditable="true" data-field="description" oninput="let fs=${descFontSize.replace('px', '')}; this.style.fontSize=fs+'px'; while(this.scrollHeight > ${maxDescHeight} && fs > 7){ fs-=0.5; this.style.fontSize=fs+'px'; }" style="font-family: 'Orkney', sans-serif; font-size: ${descFontSize}; font-weight: 400; color: ${descColor}; margin: 0; line-height: 1.25; outline: none; user-select: text; cursor: text; pointer-events: auto; white-space: pre-wrap; word-break: break-word; max-height: ${maxDescHeight}px; overflow: hidden;">${employee.description}</div>
       </div>`
    : '';

  // Per-language main title + a smaller trailing suffix (Portuguese's "(A)" in
  // "BEM-VINDO(A)" reads small and light next to the big "BEM-VINDO").
  const titleParts: Record<Language, { main: string, suffix: string }> = {
    en: { main: 'WELCOME', suffix: '' },
    pt: { main: 'BEM-VINDO', suffix: '(A)' },
    es: { main: 'BIENVENIDO', suffix: '' },
  };
  const { main: titleMain, suffix: titleSuffix } = titleParts[language] || titleParts.en;

  // Exact edge-to-edge sizing: the title's rendered width (main + smaller
  // suffix, at the same tracking used for real) must equal the panel's full
  // width exactly, so the first letter touches the left edge and the last
  // touches the right edge - no clipping, no guesswork. Solved by real
  // canvas measurement (matching the CSS letter-spacing) with two
  // proportional-correction passes, since font metrics scale linearly with
  // size, this converges essentially exactly in 2 steps.
  const letterSpacingEm = -0.03;
  let welcomeTitleSizeNum = 90;
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d') as any;
      if (ctx) {
        const measureAt = (sz: number) => {
          ctx.font = `700 ${sz}px 'Orkney', 'Inter', sans-serif`;
          ctx.letterSpacing = `${sz * letterSpacingEm}px`;
          let w = ctx.measureText(titleMain).width;
          if (titleSuffix) {
            const suffixSz = sz * 0.22;
            ctx.font = `700 ${suffixSz}px 'Orkney', 'Inter', sans-serif`;
            ctx.letterSpacing = `${suffixSz * letterSpacingEm}px`;
            w += ctx.measureText(titleSuffix).width;
          }
          return w;
        };
        let size = 90;
        size = size * (textPanelWidth / measureAt(size));
        size = size * (textPanelWidth / measureAt(size));
        // Back off a bit so the title doesn't touch the panel's edges.
        welcomeTitleSizeNum = size * 0.82;
      }
    } catch (e) {
      console.warn("Title fitting failed in generateWelcomeTemplate", e);
    }
  }
  const welcomeTitleSize = `${welcomeTitleSizeNum}px`;

  // Gradient-clipped title, TRULY centered (touching both edges by
  // construction, see sizing above). Absolutely centered via left:50% +
  // translateX(-50%) rather than text-align, since text-align does not
  // recentre unbreakable (nowrap) content once you allow it past its box -
  // it just left-aligns the grown line box (see git history for the deep
  // dive). A spacer reserves normal-flow height so the paragraph below still
  // lands in the right place. line-height 1.05 (not < 1) plus a few px of
  // top offset guarantee the glyphs' natural ascenders/cap-height never brush
  // the panel's top edge.
  const titleSpacerHeight = Math.round(welcomeTitleSizeNum * 1.05) + 16;
  const titleHtml = `
    <div style="position: relative; width: 100%; height: ${titleSpacerHeight}px; overflow: visible; user-select: none;">
      <h1 class="akira-font" style="font-size: ${welcomeTitleSize}; line-height: 1.05; margin: 0; position: absolute; left: 50%; top: 8px; transform: translateX(-50%); letter-spacing: ${letterSpacingEm}em; white-space: nowrap; z-index: 10; background: linear-gradient(90deg, #22d3ee 0%, ${purpleColor} 100%); -webkit-background-clip: text; background-clip: text; color: transparent; user-select: none; cursor: default; pointer-events: none;">${titleMain}${titleSuffix ? `<span style="font-size: 0.22em; letter-spacing: -1px;">${titleSuffix}</span>` : ''}</h1>
    </div>
  `;

  return `
    <div id="capture-target" style="width: ${cardWidth}px; height: ${cardHeight}px; background: ${cardBg}; position: relative; display: flex; flex-direction: row; overflow: hidden; box-sizing: border-box;">

       <!-- Plain panel: gradient-clipped title (edge-to-edge, no side padding) + description (its own padding) -->
       <div style="width: 55%; height: 100%; background: ${cardBg}; position: relative; display: flex; flex-direction: column; align-items: stretch; justify-content: flex-start; padding-top: 48px; box-sizing: border-box; overflow: hidden;">
          ${titleHtml}
          <div style="padding: 0 40px;">
            ${descHtml}
          </div>
       </div>

       <!-- Full-bleed panel: this whole section IS the person's frame now -->
       <div style="width: 45%; height: 100%; position: relative; overflow: hidden; z-index: 20; background: linear-gradient(135deg, #22d3ee 0%, ${purpleColor} 100%);">
          ${noise}
          ${spheres}
          ${logo}
          <img src="${employee.photoUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; object-position: top center; z-index: 5; transform: scale(${scale}) translate(${posX}px, ${posY}px); transform-origin: center center;" />
          <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 55%; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%); z-index: 6; pointer-events: none;"></div>
          <!-- Role always sits directly below the name now (was a separate bottom-right block before). -->
          <div style="position: absolute; bottom: 20px; left: 20px; z-index: 10; text-align: left; max-width: 80%;">
             <p class="akira-font" style="font-size: ${nameFontSize}; color: #ffffff; margin: 0; line-height: 1; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
               ${firstName}<br/>
               ${restName}
             </p>
             <p style="font-family: 'Orkney', sans-serif; font-size: 13px; font-weight: 300; color: rgba(255,255,255,0.85); margin: 6px 0 0 0; line-height: 1.1; text-shadow: 0 2px 10px rgba(0,0,0,0.5); text-transform: uppercase; letter-spacing: 0.5px;">
               ${roleLabel}
             </p>
          </div>
       </div>
    </div>
  `;
};

// --- SIGNATURE RENDERER ---
const generateSignatureTemplate = (employee: Employee, config: CanvasConfig, hideIcons: boolean = false, links?: { [key: string]: string }, department?: string) => {
  const noise = getNoiseOverlay();
  
  // Banner Version Only (Dimensions 600x150)
  const firstName = employee.name.split(' ')[0];
  const lastName = employee.name.split(' ').slice(1).join(' ');
  const fullName = firstName + ' ' + lastName;

  let titleSize = '34px';
  if (fullName.length > 15) titleSize = '28px';
  if (fullName.length > 20) titleSize = '24px';
  if (fullName.length > 25) titleSize = '20px';

  // Dynamic Role Size Logic to avoid Logo Overlap
  const roleLen = employee.role.length;
  let roleFontSize = '16px';
  if (roleLen > 25) roleFontSize = '14px';
  if (roleLen > 35) roleFontSize = '12px';
  if (roleLen > 45) roleFontSize = '11px';

  // LOGO SVG WRAPPER - BLACK LOGO
  const logoFill = '#000000';
  const logoSvg = `<svg viewBox="0 -30 1000 450" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" xmlns:xlink="http://www.w3.org/1999/xlink" style="fill: ${logoFill};">${LOGO_CONTENT}</svg>`;

  const spheres = getSpheresHtml('signature_logo'); 

  // ICONS are conditionally rendered based on hideIcons
  const iconsVisibility = hideIcons ? 'visibility: hidden;' : '';
  
  // Dynamic Links Generation
  let iconsHtml = `<div style="margin-top: 10px; display: flex; gap: 10px; ${iconsVisibility}">`;
  
  if (links) {
     const networkConfig: Record<string, (c: string) => string> = {
         linkedin: getLinkedinIcon,
         instagram: getInstagramIcon,
         website: getGlobeIcon,
         whatsapp: getWhatsappIcon
     };

     Object.keys(links).forEach(key => {
         if (links[key] && networkConfig[key]) {
             iconsHtml += `<a href="${links[key]}" target="_blank" style="text-decoration: none; display: flex;">${networkConfig[key]('#ffffff')}</a>`;
         }
     });
  } else {
     // Fallback defaults if no links object passed (legacy support)
      iconsHtml += `<a href="#" target="_blank" style="text-decoration: none; display: flex;">${getLinkedinIcon('#ffffff')}</a>`;
      iconsHtml += `<a href="#" target="_blank" style="text-decoration: none; display: flex;">${getInstagramIcon('#ffffff')}</a>`;
      iconsHtml += `<a href="#" target="_blank" style="text-decoration: none; display: flex;">${getGlobeIcon('#ffffff')}</a>`;
  }

  iconsHtml += `</div>`;

  // Banner Layout: Full Gradient Background with Light Gray Rectangular Overlay on Left
  // Changed white box background to #f4f4f4
  // ADDED CLASS 'signature-text-remove' TO TEXT ELEMENTS
  return `
    <div id="capture-target" style="width: 600px; height: 150px; background: linear-gradient(120deg, #22d3ee 0%, #9333ea 90%); position: relative; display: flex; overflow: hidden; box-sizing: border-box;">
       ${noise}
       ${spheres}
       
       <!-- LIGHT GRAY BOX LEFT (Rectangular) -->
       <div style="position: absolute; top: 0; left: 0; width: 220px; height: 100%; background: #f4f4f4; z-index: 5;"></div>

       <!-- LOGO LEFT (Centered in the gray area) -->
       <div style="position: absolute; top: 0; left: 0; width: 210px; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 6;">
          <div style="width: 130px; height: auto;"> 
             ${logoSvg}
          </div>
       </div>
       
       <!-- TEXT OVERLAY (Always visible, icons conditional) -->
       <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; padding-right: 40px; box-sizing: border-box; z-index: 10;">
           ${department ? `
              <h1 class="akira-font signature-text-remove" style="font-size: ${department.length > 20 ? '24px' : '34px'}; line-height: 1; color: #ffffff; margin: 0; text-align: right; letter-spacing: 1px; white-space: nowrap; text-shadow: 0 4px 12px rgba(0,0,0,0.1); padding-bottom: 15px;">
                  ${department.split(' ')[0].toUpperCase()}<br/>
                  ${department.split(' ').slice(1).join(' ').toUpperCase()}
              </h1>
           ` : `
              <h1 class="akira-font signature-text-remove" style="font-size: ${titleSize}; line-height: 1; color: #ffffff; margin: 0; text-align: right; letter-spacing: 1px; white-space: nowrap; text-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                 ${firstName.toUpperCase()}<br/>
                 ${lastName.toUpperCase()}
               </h1>
               <p class="mont-light signature-text-remove" style="font-size: ${roleFontSize}; color: #ffffff; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px; opacity: 1; line-height: 1.1; text-align: right;">
                 ${employee.role}
               </p>
           `}
           ${iconsHtml}
       </div>
    </div>
  `;
};

// --- JOB CHANGE GROUP RENDERER ---
const generateJobChangeGroupTemplate = (employees: Employee[], config: CanvasConfig, language: Language, orientation: Orientation = 'portrait') => {
  const isLandscape = orientation === 'landscape';
  const cardWidth = isLandscape ? 740 : 360;
  const cardBg = '#f1f1f1';
  const fadeColor = '#ffffff';
  const noise = getNoiseOverlay();
  const spheres = getSpheresHtml('job_change'); 
  const logo = getPepperLogoHtml(`position: absolute; top: 15px; right: ${isLandscape ? '25px' : '15px'}; width: 20px; height: 28px; z-index: 60;`);

  const title = TEXTS.NEW_ROLE[language];
  
  // Dynamic Header Font Size based on Title Length
  let headerFontSize = isLandscape ? '56px' : '48px';
  if (title.length > 8) headerFontSize = isLandscape ? '48px' : '42px'; 
  if (title.length > 10) headerFontSize = isLandscape ? '42px' : '36px'; 

  const count = employees.length;
  
  // Grid Logic
  let columns = isLandscape ? 4 : 2;
  if (isLandscape) {
      if (count <= 3) columns = 3;
      if (count > 8) columns = 5;
  } else {
      if (count > 4) columns = 3;
  }
  
  const isCompact = (isLandscape && count > 8) || (!isLandscape && count > 4);
  
  const gap = 12;
  const paddingX = isLandscape ? 40 : 30;
  const itemWidth = `calc(${100/columns}% - ${(gap * (columns - 1)) / columns}px)`;
  
  const frameGradient = `linear-gradient(to bottom, ${fadeColor} 0%, rgba(255,255,255,0) 80%), linear-gradient(135deg, #22d3ee 0%, #9333ea 100%)`;

  const rows = Math.ceil(count / columns);
  const headerHeight = isLandscape ? 140 : 160;
  const bodyPaddingY = 40;
  
  // Estimate item height (square aspect ratio)
  const availableWidth = cardWidth - (paddingX * 2);
  const approxItemSize = (availableWidth - ((columns - 1) * gap)) / columns;
  
  let containerHeight = headerHeight + bodyPaddingY + (rows * approxItemSize) + ((rows - 1) * gap);
  if (!isLandscape && containerHeight < 540) containerHeight = 540;
  if (isLandscape && containerHeight < 400) containerHeight = 400;

  let gridItems = '';

  const ARROW_UP_SVG = `<svg width="12" height="12" viewBox="0 0 270 270" fill="none" xmlns="http://www.w3.org/2000/svg"><g transform="translate(41, 41) rotate(45 94.1 94.2)"><polygon points="165.23 0 165.23 50.7 87.09 50.7 188.21 152.7 152.4 188.48 50.7 87.09 50.7 165.23 0 165.23 0 0 165.23 0" fill="#ffffff"/></g></svg>`;
  const ARROW_DOWN_SVG = `<svg width="10" height="10" viewBox="0 0 270 270" fill="none" xmlns="http://www.w3.org/2000/svg"><g transform="translate(41, 41) rotate(225 94.1 94.2)"><polygon points="165.23 0 165.23 50.7 87.09 50.7 188.21 152.7 152.4 188.48 50.7 87.09 50.7 165.23 0 165.23 0 0 165.23 0" fill="#ffffff"/></g></svg>`;

  employees.forEach(emp => {
      const nameParts = emp.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      const fullName = `${firstName} ${lastName}`;
      const fullNameLength = fullName.length;
      
      let nameSizeNum = isCompact ? 10 : 13;
      if (fullNameLength > 15) nameSizeNum -= 1;
      if (fullNameLength > 22) nameSizeNum -= 1;
      const finalNameSize = `${nameSizeNum}px`;

      const newRole = emp.role.toUpperCase();
      const prevRole = emp.previousRole ? emp.previousRole.toUpperCase() : TEXTS.PREVIOUS_ROLE_LABEL[language];

      let roleSizeNum = isCompact ? 9 : 11;
      if (newRole.length > 15) roleSizeNum -= 1;
      if (newRole.length > 25) roleSizeNum -= 1;
      const finalRoleSize = `${roleSizeNum}px`;

      gridItems += `
        <div style="width: ${itemWidth}; aspect-ratio: 1; position: relative; box-shadow: 0 8px 20px rgba(0,0,0,0.2); background: ${frameGradient}; overflow: hidden; flex-shrink: 0;">
            <img src="${emp.photoUrl}" style="width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block;"/>
            
            <div style="position: absolute; bottom: 0; left: 0; right: 0; z-index: 10;">
                <!-- Name Overlay with Gradient Fade -->
                <div style="padding: 12px 8px 4px; background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%);">
                    <p class="akira-font" style="font-size: ${finalNameSize}; color: #ffffff; margin: 0; text-align: left; letter-spacing: 0.5px; line-height: 1.1; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                        ${firstName} ${lastName}
                    </p>
                </div>

                <!-- New Role -->
                <div style="height: ${isCompact ? '24px' : '32px'}; background: linear-gradient(90deg, #22c55e 0%, #15803d 100%); display: flex; align-items: center; justify-content: space-between; padding: 0 8px;">
                    <span class="mont-font" style="color: white; font-size: ${finalRoleSize}; font-weight: bold; letter-spacing: 0.5px; line-height: 1; flex: 1; min-width: 0; margin-right: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${newRole}</span>
                    <div style="display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${ARROW_UP_SVG}</div>
                </div>

                <!-- Previous Role -->
                <div style="height: ${isCompact ? '18px' : '22px'}; background: linear-gradient(90deg, #450a0a 0%, #7f1d1d 100%); display: flex; align-items: center; justify-content: space-between; padding: 0 8px;">
                     <div style="display: flex; align-items: center; gap: 4px; opacity: 0.9; flex: 1; min-width: 0;">
                        <span class="mont-font" style="color: white; font-size: ${isCompact ? '7px' : '9px'}; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${prevRole}</span>
                     </div>
                     <div style="opacity: 0.8; transform: scale(0.9); flex-shrink: 0;">${ARROW_DOWN_SVG}</div>
                </div>
            </div>
        </div>
      `;
  });

  return `
    <div id="capture-target" style="width: ${cardWidth}px; height: ${containerHeight}px; background: ${cardBg}; position: relative; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;">
       <div style="height: ${headerHeight}px; width: 100%; background: linear-gradient(to top, ${fadeColor} 0%, rgba(255,255,255,0) 80%), linear-gradient(135deg, #22d3ee 0%, #9333ea 100%); position: relative; display: flex; align-items: center; justify-content: center; box-sizing: border-box; overflow: hidden; z-index: 20; flex-shrink: 0;">
          ${noise}
          ${spheres}
          ${logo}
          <h1 class="akira-font" style="font-size: ${headerFontSize}; line-height: 1; color: ${cardBg}; margin: 0; text-align: center; letter-spacing: 2px; position: relative; z-index: 10; text-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            ${title}
          </h1>
       </div>
       <div style="flex: 1; width: 100%; background: ${cardBg}; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; padding-top: 20px; padding-bottom: 20px;">
          <div style="display: flex; flex-wrap: wrap; justify-content: center; align-content: flex-start; gap: ${gap}px; width: 100%; padding: 0 ${paddingX}px; z-index: 10; position: relative; box-sizing: border-box;">
             ${gridItems}
          </div>
       </div>
    </div>
  `;
};

export const generateBabyTemplate = (employee: Employee, config: CanvasConfig, language: Language): string => {
  const cardWidth = 740;
  const cardHeight = 360;
  const noise = getNoiseOverlay();
  const spheres = `
    <svg viewBox="0 0 488 488" style="position: absolute; top: -140px; left: -140px; width: 280px; height: 280px; z-index: 1;">
      <defs>
        <linearGradient id="babySphereGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38B3ED" />
          <stop offset="100%" stop-color="#594494" />
        </linearGradient>
      </defs>
      <g xmlns="http://www.w3.org/2000/svg" id="Camada_1-2" data-name="Camada 1">
        <circle fill="url(#babySphereGrad1)" cx="243.56" cy="243.56" r="243.56"/>
      </g>
    </svg>
    <svg viewBox="0 0 488 488" style="position: absolute; bottom: -190px; right: -190px; width: 380px; height: 380px; z-index: 1;">
      <defs>
        <linearGradient id="babySphereGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38B3ED" />
          <stop offset="100%" stop-color="#594494" />
        </linearGradient>
      </defs>
      <g xmlns="http://www.w3.org/2000/svg" id="Camada_1-2" data-name="Camada 1">
        <circle fill="url(#babySphereGrad2)" cx="243.56" cy="243.56" r="243.56"/>
      </g>
    </svg>
  `;
  const logo = getPepperLogoHtml('position: absolute; top: 15px; left: 15px; width: 20px; height: 28px; z-index: 60;');

  const welcomeText = employee.role || TEXTS.BABY_TITLE[language] || 'SEJA BEM-VINDO(A)';
  const babyName = employee.name ? employee.name.split(' ')[0].toUpperCase() : 'NOME';
  
  const defaultDesc = language === 'pt' 
    ? 'Hoje é dia de celebrar a vida de quem acabou de chegar ao mundo! Filho da nossa Nome e do papai Nome.<br/><br/>Que esse novo capítulo seja repleto de amor, risos e memórias preciosas.<br/><br/><b>Parabéns!</b>'
    : language === 'es'
    ? '¡Hoy es día de celebrar la vida de quien acaba de llegar al mundo! Hijo de nuestra Nombre y del papá Nombre.<br/><br/>Que este nuevo capítulo esté lleno de amor, risas y recuerdos preciosos.<br/><br/><b>¡Felicidades!</b>'
    : 'Today is the day to celebrate the life of the one who just arrived in the world! Child of our Name and dad Name.<br/><br/>May this new chapter be filled with love, laughter, and precious memories.<br/><br/><b>Congratulations!</b>';

  const description = employee.description || defaultDesc;

  const scale = employee.photoScale || 1;
  const posX = employee.photoPosition?.x || 0;
  const posY = employee.photoPosition?.y || 0;
  
  const nameFontSize = babyName.length > 7 ? '42px' : '64px';

  return `
    <div id="capture-target" style="width: ${cardWidth}px; height: ${cardHeight}px; background: #ffffff; position: relative; display: flex; overflow: hidden; box-sizing: border-box; font-family: 'Orkney', sans-serif;">
       
       <!-- Left Side (Gradient) -->
       <div style="width: 55%; height: 100%; background: linear-gradient(135deg, #22d3ee 0%, #9333ea 100%); position: relative; z-index: 10; display: flex; flex-direction: column; box-sizing: border-box; overflow: hidden;">
          ${noise}
          ${spheres}
          ${logo}
          
          <div style="position: absolute; top: 45px; left: 40px; right: 40px; z-index: 20; text-align: center;">
             <div contenteditable="true" data-field="role" style="font-family: 'Orkney', sans-serif; font-weight: 300; font-size: 28px; color: white; margin: 0; line-height: 1.2; outline: none; user-select: text; cursor: text; pointer-events: auto; white-space: pre-wrap; word-break: break-word;">${welcomeText}</div>
             <div contenteditable="true" data-field="name" oninput="this.style.fontSize = this.innerText.length > 7 ? '42px' : '64px';" style="font-family: 'Orkney', sans-serif; font-weight: 700; font-size: ${nameFontSize}; color: white; margin: 0; line-height: 1; outline: none; user-select: text; cursor: text; pointer-events: auto; text-shadow: 0 4px 12px rgba(0,0,0,0.1); white-space: nowrap; overflow: hidden;">${babyName}</div>
          </div>

          <div style="position: absolute; bottom: 45px; left: 40px; right: 40px; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 16px; padding: 15px; z-index: 30; backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
             <div contenteditable="true" data-field="description" oninput="let fs=13; this.style.fontSize=fs+'px'; while(this.scrollHeight > 136 && fs > 8){ fs-=0.5; this.style.fontSize=fs+'px'; }" style="font-family: 'Orkney', sans-serif; font-weight: 400; font-size: 13px; color: white; margin: 0; line-height: 1.3; outline: none; user-select: text; cursor: text; pointer-events: auto; white-space: pre-wrap; word-break: break-word; max-height: 136px; overflow: hidden;">${description}</div>
          </div>
       </div>

       <!-- Right Side (Image) -->
       <div class="upload-hover-zone" style="width: 45%; height: 100%; position: relative; z-index: 5; background: #ffffff; overflow: hidden;">
          <img class="upload-hover-img" src="${employee.photoUrl || 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=1000&auto=format&fit=crop'}" crossorigin="anonymous" draggable="false" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transform: scale(${scale}) translate(${posX}px, ${posY}px);" />
          ${getUploadOverlayHtml(employee.id)}
       </div>
    </div>
  `;
};

export const generateActivationTemplate = (employee: Employee, orientation: Orientation = 'landscape', variant: 'light' | 'dark' = 'dark'): string => {
  const isDark = variant === 'dark';
  const isPortrait = orientation === 'portrait';
  // Portrait keeps the same 3:2 family ratio as the landscape design (1200x800),
  // just transposed to 800x1200 so it lines up with the other portrait templates in the app.
  const cardWidth = isPortrait ? 800 : 1200;
  const cardHeight = isPortrait ? 1200 : 800;
  // Footer keeps ~40% of the total height in both orientations so the gradient
  // band/wordmark proportions read the same regardless of canvas shape — but
  // only when the photo is a full-bleed background needing its own visible
  // strip above the footer. In 'circle'/'none' image modes there's no photo
  // strip to preserve, so the footer expands to reclaim that whole middle
  // section instead of leaving it as dead space (see footerHeight below,
  // computed once imageMode is known).
  const baseFooterHeight = isPortrait ? 480 : 320;

  const textMode = employee.activationTextMode || 'title';
  const textAlign = employee.activationTextAlign || 'center';
  const showTitle = textMode === 'title' || textMode === 'title_paragraph';
  const showParagraph = textMode === 'paragraph' || textMode === 'title_paragraph';
  const titleText = (employee.name || 'VOCÊ JÁ ATIVOU SEU JOGO FAVORITO HOJE?').trim();
  const paragraphText = (employee.activationParagraph || '').trim();

  // User-controlled size multipliers (default 1x each, independent), clamped to a
  // sane range. These raise/lower the ceiling below — the auto-fit script
  // (applyActivationTextFit) still runs on top and shrinks from there if the text
  // would otherwise overflow, so cranking either up can never clip text or break
  // the layout.
  const titleFontScale = Math.min(1.8, Math.max(0.7, employee.activationTitleFontScale || 1));
  const paragraphFontScale = Math.min(1.8, Math.max(0.7, employee.activationParagraphFontScale || 1));
  // Line-height (spacing between lines), independently adjustable per field.
  const titleLineHeight = Math.min(1.6, Math.max(0.9, employee.activationTitleLineHeight || 1.15));
  const paragraphLineHeight = Math.min(2.0, Math.max(1.0, employee.activationParagraphLineHeight || 1.3));

  // Base (maximum) font sizes before the live auto-fit script shrinks them to
  // guarantee the text never overflows the footer box, no matter how long it is.
  const titleBaseSize = 52 * titleFontScale;
  // A standalone paragraph is the main content, so it reads larger than the
  // small "kicker" paragraph that sits above a title in combo mode.
  const paragraphBaseSize = (textMode === 'paragraph' ? 34 : 22) * paragraphFontScale;

  const flexAlign = textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center';

  // The header mirrors the footer's gradient+sphere design, but it only needs to
  // fit the centered logo, so it's much shorter than the footer (which has to
  // fit the title/paragraph text).
  const headerHeight = isPortrait ? 160 : 130;

  // How the photo displays: full-bleed background (default, unchanged),
  // a small circular badge (crops far less aggressively — much more forgiving
  // of landscape source photos — and frees up room for longer text), or
  // hidden entirely.
  const imageMode = employee.activationImageMode || 'background';
  const circleSize = Math.min(280, Math.max(60, employee.activationCircleSize || 140));
  // Where the circular badge sits horizontally — independent of the text's
  // own alignment, so e.g. a centered title can still sit under a
  // right-aligned photo badge.
  const circlePosition = employee.activationCirclePosition || 'center';
  const circleJustify = circlePosition === 'left' ? 'flex-start' : circlePosition === 'right' ? 'flex-end' : 'center';
  // Optional solid override for the text color — when unset the title keeps
  // its brand gradient and the paragraph stays white, same as before.
  const fontColor = employee.activationFontColor || '';

  // Only the 'background' mode needs its own visible photo strip between
  // header and footer — 'circle'/'none' have nothing to show there, so the
  // footer expands to reclaim that whole middle section instead of leaving it
  // empty, handing the extra room straight to the title/paragraph (and the
  // circle badge, which lives inside the footer too).
  //
  // Within 'background' mode, the user can also shrink the photo band itself
  // (activationBackgroundHeightScale, 0.4–1). The band always stays glued to
  // the header — the image element itself never moves or resizes, it's
  // simply revealed through a shorter gap — so shrinking it just means the
  // footer grows to cover more of the same full-height image from the
  // bottom, exactly like the circle/none reclaim above.
  const defaultVisibleAreaHeight = cardHeight - baseFooterHeight - headerHeight;
  const backgroundHeightScale = Math.min(1, Math.max(0.4, employee.activationBackgroundHeightScale ?? 1));
  const footerHeight = imageMode === 'background'
    ? cardHeight - headerHeight - (defaultVisibleAreaHeight * backgroundHeightScale)
    : cardHeight - headerHeight;

  // Support for joystick position and scale slider
  const scale = employee.photoScale || 1;
  const posX = employee.photoPosition?.x || 0;
  // Apply a base offset to perfectly center the background image in the visible
  // middle band (between the new header and the footer). The landscape value
  // (-110) was tuned back when only a footer existed and the visible band ran
  // from the very top of the card; shifting it down by half the header's height
  // keeps the default framing centered in the now-smaller visible band, scaled
  // the same way for portrait's larger canvas.
  const visibleAreaHeight = cardHeight - footerHeight - headerHeight;
  const baseOffset = (isPortrait ? -110 * ((cardHeight - baseFooterHeight) / 480) : -110) + headerHeight / 2;
  const posY = (employee.photoPosition?.y || 0) + baseOffset;
  // The circle badge is its own small, self-contained box (not the tall
  // full-bleed band the baseOffset above was tuned for), so it must use the
  // user's raw joystick offset directly — applying baseOffset here shoved
  // the image far outside the circle instead of centering it.
  const circlePosY = employee.photoPosition?.y || 0;

  // Dynamically select brand gradient and logo content
  const brand = (employee.activationLogo || 'technology') as string;
  let gradientStart = '#55cbd7';
  let gradientEnd = '#573b8d';
  let brandLogoContent = LOGO_TECHNOLOGY;

  if (brand === 'studio') {
    gradientStart = '#e84e6f'; // Salsa Studio stripe/sphere colors
    gradientEnd = '#f4becf';
    brandLogoContent = LOGO_STUDIO;
  } else if (brand === 'omni' || brand === 'safe') {
    gradientStart = '#6813a5'; // Salsa Omni stripe/sphere colors
    gradientEnd = '#cb9ff7';
    brandLogoContent = LOGO_OMNI;
  } else if (brand === 'gator') {
    gradientStart = '#0d2b2a'; // Salsa Gator stripe/sphere colors
    gradientEnd = '#13694a';
    brandLogoContent = LOGO_GATOR;
  } else if (brand === 'consulting') {
    gradientStart = '#e6ab3e'; // Salsa Consulting stripe/sphere colors
    gradientEnd = '#fcd8a9';
    brandLogoContent = LOGO_CONSULTING;
  }

  // Local unique SVG helper to guarantee no ID collisions
  const makeUniqueSvg = (svgString: string, uniqueId: string): string => {
    let result = svgString.replace(/\bid=["']([^"']+)["']/g, (match, idVal) => {
      return `id="${idVal}_${uniqueId}"`;
    });
    result = result.replace(/url\(\s*#([^)]+)\s*\)/g, (match, idVal) => {
      return `url(#${idVal}_${uniqueId})`;
    });
    result = result.replace(/(href|xlink:href)=["']#([^"']+)["']/g, (match, attr, idVal) => {
      return `${attr}="#${idVal}_${uniqueId}"`;
    });
    return result;
  };

  const uniqueId = Math.random().toString(36).substring(2, 9);
  const finalLogoContent = makeUniqueSvg(brandLogoContent, uniqueId);

  const textMaxWidth = isPortrait ? cardWidth - 80 : 1000;

  // The header's sphere and logo scale down with its much shorter height instead
  // of the footer's, so they stay in proportion rather than looking oversized.
  const headerSphereScale = headerHeight / 320;
  const headerSphereSize = Math.round(1000 * headerSphereScale);
  const headerSphereLeft = Math.round(-470 * headerSphereScale);
  const headerSphereOffset = Math.round(-100 * headerSphereScale);
  const headerLogoWidth = Math.round(Math.min(280, headerHeight * 1.8));

  // Wrapped in its own full-width flex row so the circle's horizontal position
  // (circleJustify) is independent of the text's own alignment below it.
  const circleImageHtml = imageMode === 'circle' ? `
    <div style="width: 100%; display: flex; justify-content: ${circleJustify}; margin-bottom: 18px;">
      <div class="upload-hover-zone" data-activation-circle style="position: relative; width: ${circleSize}px; height: ${circleSize}px; border-radius: 50%; overflow: hidden; flex-shrink: 0; box-shadow: 0 8px 24px rgba(0,0,0,0.35); background: #1a1a1a;">
        ${employee.photoUrl ? `<img class="upload-hover-img" src="${employee.photoUrl}" crossorigin="anonymous" draggable="false" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; transform: scale(${scale}) translate(${posX}px, ${circlePosY}px);" />` : ''}
        ${getUploadOverlayHtml(employee.id)}
      </div>
    </div>
  ` : '';

  return `
    <div id="capture-target" style="width: ${cardWidth}px; height: ${cardHeight}px; background: ${isDark ? '#121212' : '#f5f5f5'}; position: relative; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box; font-family: 'Orkney', sans-serif;">

       <!-- Background Image (only in 'background' display mode) -->
       ${imageMode === 'background' && employee.photoUrl ? `
       <img class="upload-hover-img" src="${employee.photoUrl}" crossorigin="anonymous" draggable="false" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; transform: scale(${scale}) translate(${posX}px, ${posY}px); z-index: 1; pointer-events: none;" />
       ` : ''}

       ${imageMode === 'background' ? `
       <!-- Hover-to-upload zone covers just the visible photo strip between the
            opaque header/footer, since those already sit on top of it. -->
       <div class="upload-hover-zone" style="position: absolute; top: ${headerHeight}px; left: 0; right: 0; height: ${visibleAreaHeight}px; z-index: 2;">
          ${getUploadOverlayHtml(employee.id)}
       </div>
       ` : ''}

       <!-- Top Section (Gradient header, mirrors the footer design 1:1) -->
       <div style="position: absolute; top: 0; left: 0; right: 0; height: ${headerHeight}px; background: ${gradientEnd}; background-image: linear-gradient(90deg, ${gradientStart} 0%, ${gradientEnd} 100%); overflow: hidden; display: flex; align-items: center; justify-content: center; box-sizing: border-box; border-bottom: 1px solid rgba(255,255,255,0.1); z-index: 10;">

          <!-- Sphere (mirrored: pokes out from the bottom instead of the top) -->
          <div style="position: absolute; width: ${headerSphereSize}px; height: ${headerSphereSize}px; border-radius: 50%; left: ${headerSphereLeft}px; bottom: ${headerSphereOffset}px; background: linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%); z-index: 1; pointer-events: none;"></div>

          <!-- Logo (centered) -->
          <div style="width: ${headerLogoWidth}px; height: auto; position: relative; z-index: 10;">
            <svg viewBox="0 -10 1000 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="width: 100%; height: 100%; pointer-events: none; fill: #ffffff;">
              ${finalLogoContent}
            </svg>
          </div>
       </div>

       <!-- Bottom Section (solid panel, matching the other cards' background — the gradient+sphere treatment stays confined to the header) -->
       <div data-autofit-box="activation-footer" style="position: absolute; bottom: 0; left: 0; right: 0; height: ${footerHeight}px; background: ${isDark ? '#1a1a1a' : '#ffffff'}; overflow: hidden; display: flex; flex-direction: column; align-items: ${flexAlign}; justify-content: flex-start; box-sizing: border-box; padding: 40px 40px 30px; border-top: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}; z-index: 10;">

          ${circleImageHtml}

          <!-- Main Text (auto-fit: the fit-scale CSS variable is adjusted at runtime so this never overflows the footer) -->
          <div style="width: 100%; max-width: ${textMaxWidth}px; position: relative; z-index: 10;">
             <div data-autofit="activation-text" style="--fit-scale: 1; text-align: ${textAlign};">
               ${showTitle ? `
               <div contenteditable="true" data-field="name" style="font-family: 'Orkney', sans-serif; font-weight: 400; font-size: calc(${titleBaseSize}px * var(--fit-scale, 1)); letter-spacing: 1.5px; background: linear-gradient(90deg, ${gradientStart} 0%, ${gradientEnd} 100%); -webkit-background-clip: text; background-clip: text; color: transparent; caret-color: white; text-transform: uppercase; margin: 0 0 ${textMode === 'title_paragraph' ? '12px' : '0'} 0; padding-top: 0.2em; line-height: ${titleLineHeight}; outline: none; user-select: text; cursor: text; pointer-events: auto; word-break: break-word;">
                 ${titleText}
               </div>` : ''}
               ${showParagraph ? `
               <div contenteditable="true" data-field="activationParagraph" style="font-family: 'Orkney', sans-serif; font-weight: 400; font-size: calc(${paragraphBaseSize}px * var(--fit-scale, 1)); color: ${fontColor || (isDark ? 'white' : '#1a1a1a')}; text-transform: none; margin: 0; line-height: ${paragraphLineHeight}; outline: none; user-select: text; cursor: text; pointer-events: auto; word-break: break-word;">
                 ${paragraphText}
               </div>` : ''}
             </div>
          </div>

       </div>
    </div>
  `;
};

/**
 * Shrinks the General Disclosure (ACTIVATION) template's text to fit inside its
 * footer box, based on real measurements of the rendered DOM rather than a
 * character-count guess. Call this after the template HTML is mounted/updated
 * (e.g. from a MutationObserver watching the preview) so title/paragraph text
 * of any length always stays within the footer, never clipped or overflowing.
 * Scales the title and paragraph together via the `--fit-scale` CSS variable
 * set on the `[data-autofit="activation-text"]` wrapper.
 */
export const applyActivationTextFit = (root: ParentNode = document): void => {
  const wrapperEl = root.querySelector('[data-autofit="activation-text"]') as HTMLElement | null;
  const boxEl = root.querySelector('[data-autofit-box="activation-footer"]') as HTMLElement | null;
  if (!wrapperEl || !boxEl) return;

  const MIN_SCALE = 0.4;
  const STEP = 0.02;
  const VERTICAL_PADDING = 60; // matches the footer's 30px top + 30px bottom padding

  // In 'circle' image mode, the photo badge sits above the text inside the
  // same footer box (see data-activation-circle in generateActivationTemplate)
  // and takes up real vertical space that the text has to share — account for
  // it here so the fit calculation doesn't let the text overflow past it.
  const circleEl = root.querySelector('[data-activation-circle]') as HTMLElement | null;
  const circleSpace = circleEl ? circleEl.offsetHeight + 18 : 0;

  const availableHeight = Math.max(0, boxEl.clientHeight - VERTICAL_PADDING - circleSpace);

  let scale = 1;
  wrapperEl.style.setProperty('--fit-scale', String(scale));

  let guard = 0;
  while (wrapperEl.scrollHeight > availableHeight && scale > MIN_SCALE && guard < 200) {
    scale = Math.max(MIN_SCALE, scale - STEP);
    wrapperEl.style.setProperty('--fit-scale', String(scale));
    guard++;
  }
};

export const generateHiringTemplate = (employee: Employee, config: CanvasConfig): string => {
  const scale = employee.photoScale || 1;
  const posX = employee.photoPosition?.x || 0;
  const posY = employee.photoPosition?.y || 0;
  const logoFill = '#1a1a1a';

  const roleText = (employee.role || 'Account Manager').trim();
  let initialFontSize = 24;
  if (roleText.length > 24) {
    initialFontSize = Math.max(13, Math.min(24, Math.floor(750 / roleText.length)));
  }

  return `
    <div id="capture-target" style="width: 540px; height: 540px; background: white; position: relative; display: flex; flex-direction: column; overflow: hidden; font-family: 'Orkney', sans-serif;">
      <!-- Full Background Image -->
      <img class="upload-hover-img" src="${employee.photoUrl || 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1000&auto=format&fit=crop'}" crossorigin="anonymous" draggable="false" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transform: scale(${scale}) translate(${posX}px, ${posY}px); z-index: 1;" onload="
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 100;
          canvas.height = 100;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(this, 0, 0, 100, 100);
          const data = ctx.getImageData(0, 0, 100, 30).data;
          let r=0, g=0, b=0;
          for(let i=0; i<data.length; i+=4) {
            r += data[i]; g += data[i+1]; b += data[i+2];
          }
          const pixels = data.length / 4;
          const brightness = ((r/pixels) * 299 + (g/pixels) * 587 + (b/pixels) * 114) / 1000;
          const logo = this.parentElement.querySelector('svg');
          if(logo) logo.style.fill = brightness > 140 ? '#1a1a1a' : '#ffffff';
        } catch(e) { console.error('Could not detect brightness', e); }
      " />

      <!-- Hover-to-upload zone covers the visible photo area above the glass box. -->
      <div class="upload-hover-zone" style="position: absolute; top: 0; left: 0; right: 0; bottom: 220px; z-index: 2;">
        ${getUploadOverlayHtml(employee.id)}
      </div>

      <!-- Logo -->
      <div style="position: absolute; top: 20px; left: 30px; width: 110px; height: auto; z-index: 60; pointer-events: none;">
        <svg id="hiring-logo-svg" viewBox="0 -30 1000 450" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" xmlns:xlink="http://www.w3.org/1999/xlink" style="fill: ${logoFill}; transition: fill 0.3s ease;">
          ${LOGO_CONTENT}
        </svg>
      </div>

      <!-- Glassmorphism Box -->
      <div style="position: absolute; bottom: 20px; left: 20px; right: 20px; height: 200px; border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 24px; -webkit-clip-path: inset(0 round 24px); clip-path: inset(0 round 24px); z-index: 50; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; overflow: hidden;">
        
        <!-- Blur Background Workaround for html-to-image -->
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: -1;">
          <img src="${employee.photoUrl || 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1000&auto=format&fit=crop'}" crossorigin="anonymous" draggable="false" style="position: absolute; top: -320px; left: -20px; width: 540px; height: 540px; object-fit: cover; transform: scale(${scale}) translate(${posX}px, ${posY}px); filter: blur(12px);" />
          <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255, 255, 255, 0.15);"></div>
        </div>

        <!-- WE ARE HIRING Text -->
        <div style="width: 100%; text-align: center; margin-top: 10px; position: relative; z-index: 1;">
          <h1 style="font-family: 'Orkney', sans-serif; font-weight: 700; font-size: 60px; color: white; margin: 0; line-height: 1; letter-spacing: -1px; text-shadow: 0 2px 10px rgba(0,0,0,0.1); white-space: nowrap;">
            WE ARE HIRING
          </h1>
        </div>

        <!-- Hibrid Badge -->
        <div style="position: absolute; right: 26px; bottom: 84px; z-index: 1;">
          <div contenteditable="true" data-field="department" style="border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 10px; padding: 4px 10px 2px 10px; font-family: 'Orkney', sans-serif; font-weight: 300; font-size: 10px; line-height: 1; color: white; outline: none; user-select: text; cursor: text; pointer-events: auto; white-space: nowrap; background: rgba(255, 255, 255, 0.1);">
            ${employee.department || 'Remote'}
          </div>
        </div>

        <!-- Dark Pill Box -->
        <div style="position: absolute; bottom: 20px; left: 20px; right: 20px; height: 60px; background: #222222; border-radius: 30px; display: flex; align-items: center; justify-content: space-between; padding: 0 8px 0 24px; box-sizing: border-box; box-shadow: 0 10px 30px rgba(0,0,0,0.2); z-index: 1;">
          
          <!-- Job Title -->
          <div contenteditable="true" data-field="role" oninput="let fs = 24; this.style.fontSize = fs + 'px'; while (this.scrollWidth > this.clientWidth && fs > 9) { fs -= 0.5; this.style.fontSize = fs + 'px'; }" style="font-family: 'Orkney', sans-serif; font-weight: 300; font-size: ${initialFontSize}px; color: white; outline: none; user-select: text; cursor: text; pointer-events: auto; white-space: nowrap; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis;">
            ${roleText}
          </div>

          <!-- Arrow Button -->
          <div style="width: 44px; height: 44px; border-radius: 50%; -webkit-clip-path: circle(49.8% at 50% 50%); clip-path: circle(49.8% at 50% 50%); background: linear-gradient(135deg, #22d3ee 0%, #9333ea 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </div>
        </div>

      </div>
    </div>
  `;
};

// --- MAIN GENERATOR ---

export const generateCardCanvas = (data: Employee | Employee[], config: CanvasConfig, type: TemplateType, orientation: Orientation = 'portrait', language: Language = 'en', isExportMode: boolean = false, links?: { [key: string]: string }, providerFormat: ProviderFormat = 'post-sq', department?: string, opts?: { isMonthNamesOnly?: boolean, welcomeVariant?: 'light' | 'dark' }): string => {
  let cardHtml = '';
  
  if (Array.isArray(data)) {
      if (type === TemplateType.BIRTHDAY) {
         if (orientation === 'landscape') {
             cardHtml = generateMonthGroupLandscapeTemplate(data, config, language, opts);
         } else {
             cardHtml = generateMonthGroupTemplate(data, config, language, opts);
         }
      } else if (type === TemplateType.JOB_CHANGE) {
         cardHtml = generateJobChangeGroupTemplate(data, config, language, orientation);
      } else {
         return generateCardCanvas(data[0], config, type, orientation, language, isExportMode, links, providerFormat, department);
      }
  } else {
      const employee = data;
      const isLandscape = orientation === 'landscape';
      const generatorFn = isLandscape ? generateLandscapeTemplate : generatePortraitTemplate;

      switch (type) {
        case TemplateType.BIRTHDAY:
          cardHtml = generateBirthdayCardTemplate(employee, config, language, orientation, opts?.welcomeVariant || 'light');
          break;

        case TemplateType.ANNIVERSARY:
          cardHtml = generateAnniversaryCardTemplate(employee, config, language, orientation, opts?.welcomeVariant || 'light');
          break;
        
        case TemplateType.WELCOME:
          cardHtml = generateWelcomeTemplate(employee, config, language, opts?.welcomeVariant || 'light');
          break;

        case TemplateType.FAREWELL:
          cardHtml = generateFarewellCardTemplate(employee, config, language, orientation, opts?.welcomeVariant || 'light');
          break;
          
        case TemplateType.JOB_CHANGE:
          cardHtml = generateJobChangeCardTemplate(employee, config, language, orientation, opts?.welcomeVariant || 'light');
          break;
        
        case TemplateType.NEWSLETTER:
          // Signature doesn't use the translation logic for titles usually, or name/role are dynamic
          // isExportMode in this context is now 'hideIcons'
          cardHtml = generateSignatureTemplate(employee, config, isExportMode, links, department);
          break;
        
        case TemplateType.NEW_PROVIDER:
          cardHtml = generateNewProviderTemplate(employee, providerFormat);
          break;

        case TemplateType.HIRING:
          cardHtml = generateHiringTemplate(employee, config);
          break;

        case TemplateType.BABY:
          cardHtml = generateBabyTemplate(employee, config, language);
          break;

        case TemplateType.ACTIVATION:
          cardHtml = generateActivationTemplate(employee, orientation, opts?.welcomeVariant || 'dark');
          break;

        default:
          cardHtml = generatorFn(employee, config, 'HELLO', '54px', 'center', '1px', 'portrait');
      }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${getFontStyles()}
</head>
<body style="background: transparent; margin: 0; display: flex; align-items: center; justify-content: center;">
  ${cardHtml}
</body>
</html>`;
};