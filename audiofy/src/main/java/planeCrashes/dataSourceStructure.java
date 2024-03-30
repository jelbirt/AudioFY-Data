package planeCrashes;

import java.awt.Color;

public class dataSourceStructure {
	private int sheetIndex = 0;
	private int rORcIndex = 0;
	private int maxDataIndex = 0;
	private boolean columnHeader = true;
	private Double maxValue = null;
	private Double minValue = null;
	private String SheetName = "";
	private String rORcName = "";
	private Color myColor = null;
	private Double sumValue = null;
	private Double sumSqValue = null;
	private Double stdDev = null;
	private Double sqStdDev = null;
	
	public dataSourceStructure(int sheetindex, int rorcindex, /*boolean columnheader,*/ Color display_color) {
		sheetIndex = sheetindex;
		rORcIndex = rorcindex;
		//columnHeader = columnheader;		BOTH comments here are code for handling both row & column headers
		myColor = display_color;
	}
	
	public String toString() {
		return "dataSourceStructure : sheetIndex=" + sheetIndex + ",rORcIndex=" + rORcIndex + ",maxDataIndex=" + maxDataIndex + 
			",columnHeader=" + columnHeader + ",maxValue=" + maxValue + ",minValue=" + minValue + ",SheetName=" + SheetName + 
			",rORcName=" + rORcName + ",myColor=" + myColor.toString();
	}

	public Double getSumValue() {
		return sumValue;
	}

	public void setSumValue(Double sum_value) {
		sumValue = sum_value;
	}

	public Double getSumSqValue() {
		return sumSqValue;
	}

	public void setSumSqValue(Double sum_sq_value) {
		sumSqValue = sum_sq_value;
	}

	public Double getStdDev() {
		return stdDev;
	}

	public void setStdDev(Double stdDev) {
		this.stdDev = stdDev;
	}

	public Double getSqStdDev() {
		return sqStdDev;
	}

	public void setSqStdDev(Double sqStdDev) {
		this.sqStdDev = sqStdDev;
	}

	public Color getMyColor() {
		return myColor;
	}

	public void setMyColor(Color myColor) {
		this.myColor = myColor;
	}

	public String getSheetName() {
		return SheetName;
	}

	public void setSheetName(String sheetName) {
		SheetName = sheetName;
	}

	public String getrORcName() {
		return rORcName;
	}

	public void setrORcName(String rORcName) {
		this.rORcName = rORcName;
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