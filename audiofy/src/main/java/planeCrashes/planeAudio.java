package planeCrashes;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.zip.DataFormatException;

import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.LineUnavailableException;
import javax.sound.sampled.SourceDataLine;

import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.xssf.usermodel.XSSFCell;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

	// TODO : Consider addressing handling the situation of using year column as input, as years increment minimally
	// and cause problems with data spacing --> sparsity of data is so minimal that frequency barely changes (not noticeable)
	// Increase in data over the entire course (100 years) is too minimal to notice
	// + HOW TO DETECT THIS ^ --> standard deviations?

public class planeAudio {

	private Double MINHZ = 200.0;
	private Double MAXHZ = 2000.0;
	private boolean NORMALIZE = true;
	private boolean LOGTRANSFORM = true;
	private boolean STANDARDDEV = false;
	private int NUMDEVIATIONS = 1;
	private boolean batchError = true;
	private boolean indivNormalization = false;
	private int TONEPLAYTIME = 150;
	private boolean debug = true;
	
	
	public planeAudio() {
		
	}
	
	// TODO : add output with information on the max/minvalue, normalization values etc. --> maybe in new sheet in the workbook
	// Another future possibility : Reading/Writing to databases
	
	public void run() throws DataFormatException, IOException, NumberFormatException, LineUnavailableException {
		String FILE_IN_NAME = "C:\\temp\\PlaneCrashes.xlsx";
		XSSFWorkbook wb = this.getInput(new File(FILE_IN_NAME));
		if (debug) {
			ArrayList<String> sheetIndex = this.sheetIndex(wb, true, false);
			ArrayList<String> header = this.loadHeader(wb, 0, false, false, false);
			for (int i=0; i<header.size(); ++i) {
				System.out.println(header.get(i));
			}
		}
		ArrayList<dataSourceStructure> audioData = new ArrayList<dataSourceStructure>();
		dataSourceStructure DSS = new dataSourceStructure(0, 2, false);
		audioData.add(DSS);
		//DSS = new dataSourceStructure(0, 2, false);
		//audioData.add(DSS);
		String error = playData(wb, NORMALIZE, LOGTRANSFORM, STANDARDDEV, NUMDEVIATIONS, audioData, batchError, indivNormalization);
		System.out.println(error);
		
		wb.close();
	}
	
	public static void main(String[] args) {
		try {
			
			planeAudio PA = new planeAudio();
			PA.run();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
	
	// Returns an empty String if there are no errors (and also plays the audio)
	public String playData (XSSFWorkbook wb, boolean normalize, boolean logTransform, boolean standDev, int maxDev,
	ArrayList<dataSourceStructure> audioData, boolean batchReport, boolean individualNormalization) throws NumberFormatException, DataFormatException, LineUnavailableException {
		String errorReport = "";
		int maxDataIndex = 0;
		Double maxValue = null;
		Double minValue = null;
		if (standDev && maxDev < 1) {
			throw new NumberFormatException("max Deviations must be greater than 0");
		}
		
		// looping through all data and make sure there are no problems while calculating the largest/smallest values
		// which will be used later for normalizing frequency
		if (debug) {
			System.out.println("Normalize: " + normalize + "\tLog Transform: " + logTransform + "\tIndividual Norm:" + individualNormalization);
			System.out.println("Starting data analysis...");
		}
		for (int i=0; i<audioData.size(); ++i) {
			if (debug)
				System.out.println("Working on audio data Index " + i);
			dataSourceStructure DSS = audioData.get(i);
			XSSFSheet sheet = wb.getSheetAt(DSS.getSheetIndex());
			if (DSS.columnHeader) {

				XSSFRow r = sheet.getRow(DSS.getrORcIndex());
				if (r.getLastCellNum() == 0) {	// checks if no information in designated location
					if (batchReport) {
						errorReport = errorReport + "No data found in sheet " + sheet.getSheetName() + " row " + DSS.getrORcIndex()+1 + "\n";
					} else {
						return "No data found in sheet " + sheet.getSheetName() + " row " + DSS.getrORcIndex()+1 + "\n";
					}
				}
				DSS.setMaxDataIndex(r.getLastCellNum());
				if (DSS.getMaxDataIndex() > maxDataIndex) {
					maxDataIndex = DSS.getMaxDataIndex();
				}
				for (int j=0; j<=r.getLastCellNum(); ++j) {
					XSSFCell c = r.getCell(j);
					double value = 0.0;
					try {
						try {
							value = c.getNumericCellValue();
						} catch (Exception E) {
							throw new Exception ("Not a valid number");
						}
					} catch (Exception e) {
						if (batchReport) {
							errorReport = errorReport + e.getMessage() + "\n";
						} else {
							return e.getMessage();
						}
					}
					if (DSS.getMinValue() == null || DSS.getMinValue() > value) {
						DSS.setMinValue(value);
					}
					if (DSS.getMaxValue() == null || DSS.getMaxValue() < value) {
						DSS.setMaxValue(value);
					}
					if (minValue == null || minValue > value) {
						minValue = value;
					}
					if (maxValue == null || maxValue < value) {
						maxValue = value;
					}
				}
				if (!normalize && DSS.getMinValue() < 0) {
					if (batchReport) {
						errorReport = errorReport + "Negative value found in sheet " + sheet.getSheetName() + " row " + 
						DSS.getrORcIndex()+1 + "but Normalize setting is not selected. Consider normalizing your data.\n";
					} else {
						return "Negative value found in sheet " + sheet.getSheetName() + " row " + 
						DSS.getrORcIndex()+1 + "but Normalize setting is not selected. Consider normalizing your data.\n";
					}
					
				}
				audioData.set(i, DSS);		// Forces modified elements back into arrayList, ensuring they are saved
			} else {		
				if (sheet.getLastRowNum() <= 1) {	// checks if no information in designated location
					if (batchReport) {
						errorReport = errorReport + "No data found in sheet " + sheet.getSheetName() + " Column " + DSS.getrORcIndex()+1 + "\n";
					} else {
						return "No data found in sheet " + sheet.getSheetName() + " Column " + DSS.getrORcIndex()+1 + "\n";
					}
				}
				DSS.setMaxDataIndex(sheet.getLastRowNum());
				if (DSS.getMaxDataIndex() > maxDataIndex) {
					maxDataIndex = DSS.getMaxDataIndex();
				}
				if (debug)
					System.out.println("maxDataIndex = " + maxDataIndex + "\t DSS MaxDataIndex = " + DSS.getMaxDataIndex());
				for (int j=1; j<=sheet.getLastRowNum(); ++j) {
					if (debug)
						System.out.println("\tWorking on row " + j + " Cell " + DSS.getrORcIndex());
					XSSFRow r = sheet.getRow(j);
					XSSFCell c = r.getCell(DSS.getrORcIndex());
					double value = 0.0;
					try {
						try {
							value = c.getNumericCellValue();
						} catch (Exception E) {
							throw new Exception ("Not a valid number");
						}
					} catch (Exception e) {
						if (batchReport) {
							errorReport = errorReport + e.getMessage() + "\n";
						} else {
							return e.getMessage();
						}
					}
					if (debug)
						System.out.println("\t\tRead in value: " + value);
					if (DSS.getMinValue() == null || DSS.getMinValue() > value) {
						DSS.setMinValue(value);
					}
					if (DSS.getMaxValue() == null || DSS.getMaxValue() < value) {
						DSS.setMaxValue(value);
					}
					if (minValue == null || minValue > value) {
						minValue = value;
					}
					if (maxValue == null || maxValue < value) {
						maxValue = value;
					}
				}
				if (!normalize && DSS.getMinValue() < 0) {
					if (batchReport) {
						errorReport = errorReport + "Negative value found in sheet " + sheet.getSheetName() + " row " + 
						DSS.getrORcIndex()+1 + "but Normalize setting is not selected. Consider normalizing your data.\n";
					} else {
						return "Negative value found in sheet " + sheet.getSheetName() + " row " + 
						DSS.getrORcIndex()+1 + "but Normalize setting is not selected. Consider normalizing your data.\n";
					}
					
				}
				audioData.set(i, DSS);		// Forces modified elements back into arrayList, ensuring they are saved
			}	// end else (on the row)
		}	// end for(i) loop
		if (batchReport && !errorReport.isEmpty()) { 
			return errorReport;
		}
		if (debug)
			System.out.println("\nWorking on playing notes...");
		for (int i=1; i<=maxDataIndex; ++i) {
			if (debug)
				System.out.println("Working on data index " + i);
			ArrayList<Double> iNotes = new ArrayList<Double>();
			for (int j=0; j<audioData.size(); ++j) {
				dataSourceStructure DSS = audioData.get(j);
				if (debug)
					System.out.println("\tWorking on DSS " + j);
				if (DSS.getMaxDataIndex() >= i) {
					Double value = null;
					if (individualNormalization) {
						maxValue = DSS.getMaxValue();
						minValue = DSS.getMinValue();
					}
					XSSFSheet sheet = wb.getSheetAt(DSS.getSheetIndex());
					XSSFCell c = null;
					if (DSS.columnHeader) {
						XSSFRow r = sheet.getRow(DSS.getrORcIndex());
						c = r.getCell(i);
					} else {
						XSSFRow r = sheet.getRow(i);
						c = r.getCell(DSS.getrORcIndex());
					}
					value = c.getNumericCellValue();
					if (debug) {
						System.out.println("\t\tmaxValue = " + maxValue + " minValue = " + minValue);
						System.out.println("\t\tInitial data value = " + value);
					}
					if (normalize && minValue < 0) {
						// here down
						value -= minValue;	// shifts value to account for negatives
					}
					if (logTransform) {
						value = Math.log(value) / Math.log(maxValue);
					} else {
						value /= maxValue;		// proportionalizes value to maxValue, obtaining a 0 < value < 1
					}
					value = (value * (MAXHZ - MINHZ)) + MINHZ;
					if (debug)
						System.out.println("\t\tFinal data values = " + value);
					iNotes.add(value);
					
				}
			}
			playNotes(iNotes);
		}
		return errorReport;
	}
	
	public void playNotes(ArrayList<Double> iNotes) throws LineUnavailableException {
		AudioFormat[] af = new AudioFormat[iNotes.size()];
		SourceDataLine[] line = new SourceDataLine[iNotes.size()];
		for (int i=0; i<iNotes.size(); ++i) {
			af[i] = new AudioFormat(SAMPLE_RATE, 8, 1, true, true);
			line[i] = AudioSystem.getSourceDataLine(af[i]);
			line[i].open(af[i], SAMPLE_RATE);
			line[i].start();
		}
		for (int i=0; i<iNotes.size(); ++i) {
			byte [] toneBuffer = createSinWaveBuffer(iNotes.get(i), TONEPLAYTIME);	
	        line[i].write(toneBuffer, 0, toneBuffer.length);
		}
		   
		   
		for (int i=0; i<iNotes.size(); ++i) {   
			line[i].drain();
			line[i].close();
		}
	}
	
	protected static final int SAMPLE_RATE = 16 * 1024;
	public static byte[] createSinWaveBuffer(double freq, int ms) {
	       int samples = (int)((ms * SAMPLE_RATE) / 1000);
	       byte[] output = new byte[samples];
	       double period = (double)SAMPLE_RATE / freq;
	       for (int i = 0; i < output.length; i++) {
	           double angle = 2.0 * Math.PI * i / period;
	           output[i] = (byte)(Math.sin(angle) * 127f);  
	       } 
	       return output;
	}
	
	public class dataSourceStructure {
		private int sheetIndex = 0;
		private int rORcIndex = 0;
		private int maxDataIndex = 0;
		private boolean columnHeader = false;
		private Double maxValue = null;
		private Double minValue = null;
		
		
		public dataSourceStructure(int sheetindex, int rorcindex, boolean columnheader) {
			sheetIndex = sheetindex;
			rORcIndex = rorcindex;
			columnHeader = columnheader;
		}

		public int getMaxDataIndex() {
			return maxDataIndex;
		}

		public void setMaxDataIndex(int maxDataIndex) {
			this.maxDataIndex = maxDataIndex;
		}

		public Double getMaxValue() {
			return maxValue;
		}

		public void setMaxValue(Double maxValue) {
			this.maxValue = maxValue;
		}

		public Double getMinValue() {
			return minValue;
		}

		public void setMinValue(Double minValue) {
			this.minValue = minValue;
		}

		public int getSheetIndex() {
			return sheetIndex;
		}

		public int getrORcIndex() {
			return rORcIndex;
		}

		public boolean isColumnHeader() {
			return columnHeader;
		}
		
	}
	
	public ArrayList<String> sheetIndex(XSSFWorkbook wb, boolean caseSensitive, boolean allowDuplicates) throws DataFormatException {
		ArrayList<String> indexes = new ArrayList<String>();
		for (int i=0; i<wb.getNumberOfSheets(); ++i) {
			String h = wb.getSheetName(i);
			if (!caseSensitive) {
				h = h.toUpperCase();
			}
			if (indexes.contains(h) && !allowDuplicates) {
				throw new DataFormatException();
			}
			indexes.add(h);
		}
		return indexes;
	}

	public ArrayList<String> loadHeader(XSSFWorkbook wb, int sheetIndex, boolean columnHeader, boolean caseSensitive, boolean allowDuplicates) throws DataFormatException {
		XSSFSheet sheet = wb.getSheetAt(sheetIndex);
		ArrayList<String> header = new ArrayList<String>();
		if (columnHeader) {
			for (int i=0; i<=sheet.getLastRowNum(); ++i) {
				XSSFRow r = sheet.getRow(i);
				XSSFCell c = r.getCell(0);
				String h = c.getStringCellValue();
				if (!caseSensitive) { 
					h = h.toUpperCase();
				}
				if (header.contains(h) && !allowDuplicates) {
					throw new DataFormatException();
				}
				header.add(h);
			}
		} else {		// case of row headers (top row is header)
			XSSFRow r = sheet.getRow(0);
			for (int i=0; i<r.getLastCellNum(); ++i) {
				XSSFCell c = r.getCell(i);
				String h = c.getStringCellValue();
				if (!caseSensitive) { 
					h = h.toUpperCase();
				}
				if (header.contains(h) && !allowDuplicates) {
					throw new DataFormatException();
				}
				header.add(h);
			}
		}
		return header;
	}
	
	public XSSFWorkbook getInput(File file) throws IOException {
		FileInputStream fis = new FileInputStream(file);
		XSSFWorkbook wb = new XSSFWorkbook(fis);
		return wb;
	}
	
	
	
}
