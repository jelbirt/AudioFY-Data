/* @Author Jacob Elbirt
*	AudioFY Project created during 2023 Summer Aisiku Research Fellowship
*	Not intended for commercial use
*/

package planeCrashes;

import java.util.ArrayList;
import java.util.Enumeration;
import java.util.Hashtable;
import java.util.zip.DataFormatException;

import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.LineUnavailableException;
import javax.sound.sampled.SourceDataLine;

import org.apache.poi.xssf.usermodel.XSSFCell;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

public class playThread extends Thread {
	private playPanel PP = null;
	private dataPanel DP = null;
	private AudioFY AF = null;
	private boolean isRunning = false;
	private boolean isStop = false;
	private int currentIndex = 0;
	private XSSFWorkbook WB = null;
	private Configurations CONFIG = null;
	private ArrayList<dataSourceStructure> currentDSS = null;
	private double globalMaxValue = 0.0;
	private double globalMinValue = 0.0;
	
	public playThread(AudioFY af, playPanel pp, dataPanel dp) {
		super();
		AF = af; 
		PP = pp;
		DP = dp;
	}
	
	public boolean isStop() {
		return isStop;
	}

	public void setStop(boolean isStop) {
		this.isStop = isStop;
	}

	public void clearCurrentIndexGraph(boolean remove_from_data) {
		if(currentIndex >= 0) {
			PP.clearGraphIndex(currentIndex, remove_from_data);
		}
	}
	
	public void setGlobalMinMax(double[] minmax) {
		globalMinValue = minmax[0];
		globalMaxValue = minmax[1];
	}
	
	public double[] getGlobalMinMax() {
		return new double[] { globalMinValue, globalMaxValue };
	}

	public void setCurrentConfigurations(Configurations configs) {
		CONFIG = configs;
	}
	
	public void setCurrentDSSList(ArrayList<dataSourceStructure> dssList) {
		currentDSS = dssList;
	}

	@Override public void run() {
		while(true) {
			if(isRunning) {
				try {
					executeCurrentIndex(true);
					incrementCurrentIndex();
				} catch(Exception e) {
					isRunning = false;
					if(!e.getMessage().equals("")) {
						e.printStackTrace();
						AF.displayErrorMSG(e);
					}
				}
			} else if(isStop) {
				isStop = false;
				currentIndex = 0;
			}
		}
	}

	public void executeIndex(boolean playNote, int index) throws Exception {
		setCurrentIndex(index);
		executeCurrentIndex(playNote);
	}
	
	public void executeCurrentIndex(boolean playNote) throws Exception {
		// Configurations Check
		if(CONFIG == null || currentDSS == null || currentDSS.isEmpty()) {
			throw new Exception("");
		}

		// Check for null workbook.
		if(WB == null) {
			isRunning = false;
			throw new Exception("");
		}

		// Test for Configuration Conflicts (normalization off but negative values or invalid stdev setup)
		testData();
		
		// Check for data, if none then set isRunning to false and alert that we have reached the end of the data.
		boolean moreData = false; 
		int maxMDI = 0;
		for(int i=0;i<currentDSS.size();i++) {
			dataSourceStructure dss = currentDSS.get(i);
			int mdi = dss.getMaxDataIndex() - 1; // -1 accounts for the header
			if(dss.getMaxDataIndex() > maxMDI) {
				maxMDI = dss.getMaxDataIndex();
			}
			if (mdi >= currentIndex) {
				moreData = true;
				i = currentDSS.size();
			}
		}
		if(!moreData) {	// end data play through, publish outputs
			AF.publishOutputs(CONFIG);
			AF.displayMessage("Completed!","The data set has been run through; play is complete.");
			if(currentIndex == maxMDI && isRunning) {
				currentIndex--;
			}
			throw new Exception("");
		}
		
		// Obtain the Data for the Current (row/col) Index from each Spreadsheet and update values as needed
		Hashtable<String,double[]> full_data = getData();
		
		// Update the DP and GP
		updatePanels(currentIndex, full_data, true);
		
		// Play the tones
		if(playNote) { 
			playNotes(getNoteData(full_data));
		}
		

	}
	
	public void updatePanels(int timeIndex, Hashtable<String,double[]> data, boolean save) throws DataFormatException {
		// Data Panel
		DP.update_display_data(data);
		
		// PP
		PP.update_display_data(timeIndex, data, currentDSS, save, CONFIG);
	}
	
	public XSSFWorkbook getWB() {
		return WB;
	}

	public void setWB(XSSFWorkbook wB) {
		WB = wB;
	}

	public void incrementCurrentIndex() {
		currentIndex += 1;
	}

	public void decrementCurrentIndex() {
		if(currentIndex > 0) {
			currentIndex -= 1;
		}
	}

	public int getCurrentIndex() {
		return currentIndex;
	}

	public void setCurrentIndex(int current_index) throws NumberFormatException {
		if(current_index < 0) {
			throw new NumberFormatException("Invalid current index (" + current_index + ") - must be >= 0.");
		}
		if(current_index != currentIndex) {
			currentIndex = current_index; 
		}
	}

	public boolean isRunning() { return isRunning; }
	public void setRunning(boolean yorn) { isRunning = yorn; }
	
	public Hashtable<String,double[]> getData() {
		double maxValue = globalMaxValue;
		double minValue = globalMinValue;
		Hashtable<String,double[]> data = new Hashtable<String,double[]>();

		for (int j=0; j<currentDSS.size(); ++j) {
			dataSourceStructure DSS = currentDSS.get(j);

			double[] values = new double[] { 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0 }; // raw, normalized, log(), Proportional, Hz, Std Dev, Sq Std Dev
			if (DSS.getMaxDataIndex() >= currentIndex) {
				Double origVal = null;
				Double value = null;
				if (CONFIG.getNormalization().equals("Individual")) {
					maxValue = DSS.getMaxValue();
					minValue = DSS.getMinValue();
				}
				XSSFSheet sheet = WB.getSheetAt(DSS.getSheetIndex());
				XSSFCell c = null;
				XSSFRow r = sheet.getRow(currentIndex+1);
				if (r != null) {
					c = r.getCell(DSS.getrORcIndex());
				}

				if(c != null) {
					value = c.getNumericCellValue();
					values[0] = value;
					
					// Standard Deviations are based on Raw Values
					if(CONFIG.isStandardDevs()) {
						values[5] = Math.abs(value / DSS.getStdDev());
						values[6] = Math.abs((value*value) / DSS.getSqStdDev());
					}
					
					// Normalization of Raw if Negative Value ONLY
					if (!CONFIG.getNormalization().equals("") && minValue < 0) {
						// here down
						value -= minValue;	// shifts value to account for negatives
						if(value > maxValue) {
							maxValue += Math.abs(minValue); // adjust max value for the slide
						}
					}

					if (CONFIG.getNormalization().equals("Global")) {
						values[1] = (value - globalMinValue) / (globalMaxValue - globalMinValue);
					} else if (CONFIG.getNormalization().equals("Individual")) {
						values[1] = (value - DSS.getMinValue()) / (DSS.getMaxDataIndex() - DSS.getMinValue());
					}


					// Log Transformation
					if (CONFIG.isLogTransform()) {
						value = Math.log(value);
					}
					values[2] = value;
					
					// Proportional
					if(CONFIG.isLogTransform()) {
						value /= Math.log(maxValue);
					} else {
						value /= maxValue;
					}
					values[3] = value;
					
					// Frequency Restriction
					value = (value * (Integer.valueOf(CONFIG.getMaxFreq()) - Integer.valueOf(CONFIG.getMinFreq())) 
							+ Integer.valueOf(CONFIG.getMinFreq()));
					values[4] = value;
					
					// Put the information in
					data.put((DSS.getSheetName()+"-"+DSS.getrORcName()), values);
				}
			}
		}	
		
		return data;
	}
	
	public ArrayList<Double> getNoteData(Hashtable<String,double[]> data) {
		Enumeration<String> keys = data.keys();
		ArrayList<Double> iNotes = new ArrayList<Double>();
		
		while(keys.hasMoreElements()) {
			double[] values = data.get(keys.nextElement());
			iNotes.add(values[4]); // from getData storage
		}

		return iNotes;
	}
	
	public void testData () throws DataFormatException {
		String errorReport = "";
		
		int maxDev = 1; 
		if (CONFIG.isStandardDevs() && maxDev < 1) {
			throw new NumberFormatException("Max Deviations must be greater than 0");
		}
		
		// Verify Values and Normalization
		for (int i=0; i<currentDSS.size(); ++i) {
			dataSourceStructure DSS = currentDSS.get(i);
			XSSFSheet sheet = WB.getSheetAt(DSS.getSheetIndex());
			
			if (CONFIG.getNormalization().equals("") && DSS.getMinValue() < 0) {
				if (CONFIG.isBatchError()) {
					errorReport = errorReport + "Negative value found in sheet " + sheet.getSheetName() + " row " + 
					DSS.getrORcIndex()+1 + " but Normalize setting is not selected. Consider normalizing your data.\n";
				} else {
					throw new DataFormatException("Negative value found in sheet " + sheet.getSheetName() + " row " + 
					DSS.getrORcIndex()+1 + " but Normalize setting is not selected. Consider normalizing your data.");
				}
				
			}
			
		}	// end for(i) loop
		
		if (!errorReport.isEmpty()) { 
			throw new DataFormatException(errorReport);
		}
	}
	
	public void playNotes(ArrayList<Double> tones) throws LineUnavailableException {
		if(tones.isEmpty()) {
			return;
		}
        
		AudioFormat[] af = new AudioFormat[tones.size()];
		SourceDataLine[] SDLine = new SourceDataLine[tones.size()];
		double tempToneSum = 0;
		for (int i=0; i<tones.size(); ++i) {
			
			af[i] = new AudioFormat(SAMPLE_RATE, 8, 1, true, true);
		
			SDLine[i] = AudioSystem.getSourceDataLine(af[i]);
			SDLine[i].open(af[i], SAMPLE_RATE);
			SDLine[i].start();
			
			if (CONFIG.isAudioOutput()) {
				tempToneSum += tones.get(i);
				if (i == tones.size() - 1) {
					byte [] toneSUMbuffer = createSinWaveBuffer(tones.get(i), CONFIG.getToneLength());
					AF.getAudioOutputTones().add(toneSUMbuffer);
					tempToneSum = 0;
				}
				if (!AF.getAudioOutputAFs().contains(af[i])) {
					AF.getAudioOutputAFs().add(af[i]);
				}
			}
		}
		
		for (int i=0; i<tones.size(); ++i) {
			byte [] toneBuffer = createSinWaveBuffer(tones.get(i), CONFIG.getToneLength());	
	        SDLine[i].write(toneBuffer, 0, toneBuffer.length);
		}

		for (int i=0; i<tones.size(); ++i) {   
			SDLine[i].drain();
			SDLine[i].close();
		}
	}
	
	protected static final int SAMPLE_RATE = 16 * 1024;
	public static byte[] createSinWaveBuffer(double freq, int ms) {
	       int samples = (int)((ms * SAMPLE_RATE) / 1000);
	       byte[] audioOutput = new byte[samples];
	       double period = (double)SAMPLE_RATE / freq;
	       for (int i = 0; i < audioOutput.length; i++) {
	           double angle = 2.0 * Math.PI * i / period;
	           audioOutput[i] = (byte)(Math.sin(angle) * 127f);  
	       } 
	       return audioOutput;
	}
}
