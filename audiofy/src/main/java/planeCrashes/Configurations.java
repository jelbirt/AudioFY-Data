/* @Author Jacob Elbirt
*	AudioFY Project created during 2023 Summer Aisiku Research Fellowship
*	Not intended for commercial use
*/

package planeCrashes;

import java.awt.Color;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.Hashtable;

public class Configurations implements Serializable {

		private static final long serialVersionUID = 1L;
		private String minFreq = "";
		private String maxFreq = "";
		private boolean logTransform = false;
		private boolean standardDevs = false;
		private boolean excelOutput = false;
		private boolean TDOutput = false;
		private boolean audioOutput = false;
		private boolean batchError = false;
		private String normalization = "";
		private String inputFile = "";
		private String outputDirectory = "";
		private int toneLength = 0;
		private Color[] colorList = new Color[] {};
		private String graphTitle = "";
		private String yAxisTitle = "";
		private String xAxisTitle = "";
		private String yAxisMin = "0.0";
		private String yAxisMax = "0.0";
		private boolean yAxisTicks = false;
		private int yTickIntIndex = 0;
		private boolean yTickLabels = false;
		private int graphDataFormatIndex = 3;

		
		// String key in HT is SHEET_NAME
		// 0 Index is ALWAYS string version of boolean for headers (RorC)
		private Hashtable<String, ArrayList<String>> dataSheets = new Hashtable<String, ArrayList<String>>();	
		
		public Configurations() {
		}

		public Color[] getColorList() {
			return colorList;
		}

		public void setColorList(Color[] colorList) {
			this.colorList = colorList;
		}

		public Hashtable<String, ArrayList<String>> getDataSheets() {
			return dataSheets;
		}

		public void setDataSheets(Hashtable<String, ArrayList<String>> dataSheets) {
			this.dataSheets = dataSheets;
		}

		public int getToneLength() {
			return toneLength;
		}

		public void setToneLength(int toneLength) {
			this.toneLength = toneLength;
		}

		public String getInputFile() {
			return inputFile;
		}

		public void setInputFile(String inputFile) {
			this.inputFile = inputFile;
		}

		public String getOutputDirectory() {
			return outputDirectory;
		}

		public void setOutputDirectory(String outputDirectory) {
			this.outputDirectory = outputDirectory;
		}

		public void saveObject(File file, Object serObj) throws IOException {
			FileOutputStream fileOut = new FileOutputStream(file.getAbsoluteFile());
            ObjectOutputStream objectOut = new ObjectOutputStream(fileOut);
            objectOut.writeObject(serObj);
            objectOut.close();
            fileOut.close();
		}
		
		public Configurations loadObject(File file) throws IOException, ClassNotFoundException {
			FileInputStream fileIn = new FileInputStream(file.getAbsoluteFile());
            ObjectInputStream objectIn = new ObjectInputStream(fileIn);
            Object obj = objectIn.readObject();        
            objectIn.close();
            fileIn.close();
            return (Configurations) obj;
		}
		
		public String getMinFreq() {
			return minFreq;
		}

		public void setMinFreq(String minFreq) {
			this.minFreq = minFreq;
		}

		public String getMaxFreq() {
			return maxFreq;
		}

		public void setMaxFreq(String maxFreq) {
			this.maxFreq = maxFreq;
		}

		public boolean isLogTransform() {
			return logTransform;
		}

		public void setLogTransform(boolean logTransform) {
			this.logTransform = logTransform;
		}

		public boolean isStandardDevs() {
			return standardDevs;
		}

		public void setStandardDevs(boolean standardDevs) {
			this.standardDevs = standardDevs;
		}

		public boolean isExcelOutput() {
			return excelOutput;
		}

		public void setExcelOutput(boolean excelOutput) {
			this.excelOutput = excelOutput;
		}

		public boolean isTDOutput() {
			return TDOutput;
		}

		public void setTDOutput(boolean tDOutput) {
			TDOutput = tDOutput;
		}

		public boolean isAudioOutput() {
			return audioOutput;
		}

		public void setAudioOutput(boolean audioOutput) {
			this.audioOutput = audioOutput;
		}

		public boolean isBatchError() {
			return batchError;
		}

		public void setBatchError(boolean batchError) {
			this.batchError = batchError;
		}

		public String getNormalization() {
			return normalization;
		}

		public void setNormalization(String normalization) {
			this.normalization = normalization;
		}
		
		public String getyAxisMin() {
			return yAxisMin;
		}

		public void setyAxisMin(String yAxisMin) {
			this.yAxisMin = yAxisMin;
		}

		public String getyAxisMax() {
			return yAxisMax;
		}

		public void setyAxisMax(String yAxisMax) {
			this.yAxisMax = yAxisMax;
		}

		public boolean isyAxisTicks() {
			return yAxisTicks;
		}

		public void setyAxisTicks(boolean yAxisTicks) {
			this.yAxisTicks = yAxisTicks;
		}

		public int getyTickIntIndex() {
			return yTickIntIndex;
		}

		public void setyTickIntIndex(int yTickInt) {
			this.yTickIntIndex = yTickInt;
		}

		public String getGraphTitle() {
			return graphTitle;
		}

		public void setGraphTitle(String graphTitle) {
			this.graphTitle = graphTitle;
		}

		public String getyAxisTitle() {
			return yAxisTitle;
		}

		public void setyAxisTitle(String yAxisTitle) {
			this.yAxisTitle = yAxisTitle;
		}

		public String getxAxisTitle() {
			return xAxisTitle;
		}

		public void setxAxisTitle(String xAxisTitle) {
			this.xAxisTitle = xAxisTitle;
		}

		public boolean isyTickLabels() {
			return yTickLabels;
		}

		public void setyTickLabels(boolean yTickLabels) {
			this.yTickLabels = yTickLabels;
		}

		public int getGraphDataFormatIndex() {
			return graphDataFormatIndex;
		}

		public void setGraphDataFormatIndex(int graphDataFormat) {
			this.graphDataFormatIndex = graphDataFormat;
		}
		
		
}