/* @Author Jacob Elbirt
*	AudioFY Project created during 2023 Summer Aisiku Research Fellowship
*	Not intended for commercial use
*/

package planeCrashes;

import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Point;
import java.awt.RenderingHints;
import java.util.ArrayList;
import javax.swing.JPanel;
import java.awt.GridBagLayout;

public class GraphPanel extends JPanel {
	private static final long serialVersionUID = 1L;
	private int axisOffset = 40;
	private Color axisColor = Color.black;
	private Color tickLineColor = Color.LIGHT_GRAY;
	private int fontSize = 12;
	private double dataPointOffset = 1.1;
	private Font displayFont = new Font("TimesRoman", Font.PLAIN, fontSize);
	private ArrayList<Object[]> masterData = new ArrayList<Object[]>();
	private Configurations CONFIG = null;
	private String yMinDefault = "0";
	private String yMaxDefault = "2000";
	private String graphTitle = "Frequency (Hz) of Data Values";
	private String xAxisTitle = "X-Axis (Time)";
	private String yAxisTitle = "Y-Axis (Hz)";
	private boolean needDataRepaint = true;

	
	public GraphPanel(int axis_offset, Configurations config, AudioFY AF) { 
		axisOffset = axis_offset;
		CONFIG = config;
		setOpaque(true);
		setDoubleBuffered(true);
		yMinDefault = config.getyAxisMin();
		yMaxDefault = config.getyAxisMax();
		
		
		GridBagLayout gridBagLayout = new GridBagLayout();
		gridBagLayout.columnWidths = new int[]{467, 0};
		gridBagLayout.rowHeights = new int[]{270, 37, 0};
		gridBagLayout.columnWeights = new double[]{0.0, Double.MIN_VALUE};
		gridBagLayout.rowWeights = new double[]{0.0, 0.0, Double.MIN_VALUE};
		setLayout(gridBagLayout);

	}
	
	@Override protected void paintComponent(Graphics g) {
		super.paintComponent(g);
		Point centerX = new Point(getWidth()/2,axisOffset/2);
		paintText(g,graphTitle, centerX, axisColor, true, false);	
		paintAxis(g,true,graphTitle,xAxisTitle,yAxisTitle,yMinDefault,yMaxDefault);
		repaintData();
	}

	public void setCONFIG(Configurations config) {
		CONFIG = config;
	}

	public void repaintData() {
		paintData(masterData, true);
	}
	
	public void clearWindow(Graphics g) {
		g.setColor(Color.white);
		g.fillRect(0, 0, getWidth(), getHeight());
		g.dispose();
	}

	public void clearGraph(Graphics g) {
		g.setColor(Color.white);
		g.fillRect(axisOffset + 1, axisOffset, getWidth() - (axisOffset), getHeight() - (2*axisOffset));
		g.dispose();
	}
	
	public void clearX(int xPos, int size, boolean remove) {
		Graphics g = getGraphics();
		g.setColor(Color.white);

		if(remove) {
			for(int i=(masterData.size()-1);i >= 0; i--) {
				Point p = (Point) masterData.get(i)[1];
				if(p.x == xPos) {
					masterData.remove(i);
				}
			}
		}
		g.fillRect((int)(xPos + axisOffset + (xPos * size * dataPointOffset)), axisOffset, size, getHeight() - (2 * axisOffset));
		g.dispose();
	}
	
	public void clearXY(Point pos, int size, boolean remove) {
		Graphics g = getGraphics();
		g.setColor(Color.white);

		for(int i=(masterData.size()-1);i >= 0; i--) {
			Point p = (Point) masterData.get(i)[1];
			if(p.x == pos.x && p.y == pos.y) {
				if(remove) { 
					masterData.remove(i);
				}
				g.fillRect((int)(pos.x + axisOffset + (pos.x * size * dataPointOffset)), (getHeight() - axisOffset) - pos.y, size, size);	
			}
		}
		g.dispose();
	}
 	
	public void paintData(ArrayList<Object[]> data, boolean save) {
		Graphics g = getGraphics();
		
		if(save) {
			masterData.addAll(data);
		}
		
		for(int i=0;i<data.size();i++) {
			g.setColor((Color)data.get(i)[0]);
			Point loc = (Point)data.get(i)[1];
			int yPos = (int)((double)loc.y / Double.valueOf(CONFIG.getMaxFreq()) * (double)(getHeight() - (2 * axisOffset))); // scaling
			int size = (Integer)data.get(i)[2];
			g.fillOval((int)(loc.x + axisOffset + (loc.x * size * dataPointOffset)), (getHeight() - axisOffset) - yPos, size, size);
		}
		g.dispose();
	}
	
	public void updateRepaintGP(playThread PT, Graphics g, AudioFY AF) {
		
		Graphics g2 = getGraphics();
		if (needDataRepaint) {
			g2 = getGraphics();
			int dataIndex = PT.getCurrentIndex();
		}
		
		// reset graph space to blank rectangle
		g.setColor(Color.white);
		g.fillRect(axisOffset + 1, axisOffset, getWidth() - (2*axisOffset), getHeight() - (2*axisOffset));
		
		// update config with AF textbox values, then updateGraphTitles()
		CONFIG.setGraphTitle(AF.graphTitleTxt.getText()); graphTitle = CONFIG.getGraphTitle();
		CONFIG.setxAxisTitle(AF.xAxisTitleTxt.getText()); xAxisTitle = CONFIG.getxAxisTitle();
		CONFIG.setyAxisTitle(AF.yAxisTitleTxt.getText()); yAxisTitle = CONFIG.getyAxisTitle();
		updateGraphTitles(CONFIG.getGraphTitle(), CONFIG.getxAxisTitle(), CONFIG.getyAxisTitle());		
		
		if (needDataRepaint) {
			paintComponent(g2);
		}
		
		// handle axis tick/labels and update relevant gp and config variables
		if (AF.yAxisTicksCheckBox.isVisible()) {
			if (AF.yAxisTicksCheckBox.isSelected()) {
				CONFIG.setyAxisTicks(true);
				CONFIG.setyTickIntIndex(Integer.valueOf( (String) AF.yTickIntComboBox.getSelectedItem()) );
				CONFIG.setyTickLabels(AF.yTickLabelsCheckBox.isSelected());
				paintTickLines(g, String.valueOf(CONFIG.getyTickIntIndex()), CONFIG.isyTickLabels());
			}
		}

	}

	public void paintAxis(Graphics g, boolean labels, String graphTitle, String xTitle, String yTitle,
	String yMin, String yMax) {
		
		Point start = new Point(axisOffset, getHeight() - axisOffset);
		Point endX = new Point(getWidth() - axisOffset, getHeight() - axisOffset);
		Point endY = new Point(axisOffset, axisOffset);
		
		g.setColor(axisColor);
		g.drawLine(start.x, start.y, endX.x, endX.y);	// draws x axis
		g.drawLine(start.x, start.y, endY.x, endY.y);	// draws y axis
		
		if(labels) {
			endX.x -= g.getFontMetrics().stringWidth(xTitle); // positioned to end at end of axis line
			endX.y += g.getFontMetrics().getHeight(); // under the axis
			paintText(g, xTitle, endX, axisColor, false, false);
			endY.y -= (g.getFontMetrics().getHeight() / 2 + 4); // "-4" here and line below are custom adjustments to place yAxisTitle over axis
			endY.x = axisOffset - 4;
			paintText(g, yTitle, endY, axisColor, false, true);
			
			endY.x = axisOffset - g.getFontMetrics().stringWidth(String.valueOf(yMax));
			endY.y = axisOffset + (g.getFontMetrics().getHeight() / 2);	
			paintText(g, yMax, endY, axisColor, false, false);

			endY.x = axisOffset - g.getFontMetrics().stringWidth(String.valueOf(yMin)); 
			endY.y = getHeight() - axisOffset + (g.getFontMetrics().getHeight() / 2);
			paintText(g, yMin, endY, axisColor, false, false);
			
		}
	}
	
	public void paintTickLines(Graphics g, String numTicks, boolean tickLabels) {
		if (Integer.valueOf(numTicks) != 0) {
		int divisor = Integer.valueOf(numTicks);
		System.out.println("divisor: \t " + divisor);
		Point start = new Point(axisOffset, getHeight() - axisOffset);
		Point endY = new Point(axisOffset, axisOffset);
		
		int tickSpacing = (start.y - endY.y) / divisor;
		g.setColor(tickLineColor);
		for (int i = 0; i * tickSpacing < (start.y - tickSpacing); ++i) {
			g.drawLine(axisOffset+1, (axisOffset + (i) * tickSpacing), getWidth() - axisOffset, (axisOffset + (i) * tickSpacing));
			if (tickLabels) {
				Point tickLabelStart = new Point(getWidth() - axisOffset + 3, axisOffset + i * tickSpacing);
				paintText(g, (100 - (i * 100/divisor)) + "%", tickLabelStart, tickLineColor, false, false);
			}
		}
				
		}
		g.setColor(axisColor);	// resets graphics color to axisColor (black)
	}
	
	public void updateGraphTitles(String graphTitle, String xAxisTitle, String yAxisTitle) {
		this.graphTitle = graphTitle;
		this.xAxisTitle = xAxisTitle;
		this.yAxisTitle = yAxisTitle;
	}
	
	public void paintText(Graphics g, String text, Point start, Color c, boolean centerX, boolean rotate90) {
		Graphics2D g2 = (Graphics2D)g;
		g2.setColor(c);
		g2.setFont(displayFont);
		g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
		int width = g2.getFontMetrics().stringWidth(text);
		if(!centerX) { 
			width = 0;
		}
		g2.drawString(text,start.x - (width/2),start.y); 
	}

	public String getyMinDefault() {
		return yMinDefault;
	}

	public void setyMinDefault(String yMinDefault) {
		this.yMinDefault = yMinDefault;
	}

	public String getyMaxDefault() {
		return yMaxDefault;
	}

	public void setyMaxDefault(String string) {
		this.yMaxDefault = string;
	}

	public static long getSerialversionuid() {
		return serialVersionUID;
	}

	public int getAxisOffset() {
		return axisOffset;
	}

	public Color getAxisColor() {
		return axisColor;
	}

	public int getFontSize() {
		return fontSize;
	}

	public double getDataPointOffset() {
		return dataPointOffset;
	}

	public Font getDisplayFont() {
		return displayFont;
	}

	public ArrayList<Object[]> getMasterData() {
		return masterData;
	}

	public Configurations getCONFIG() {
		return CONFIG;
	}

	public String getGraphTitle() {
		return graphTitle;
	}

	public String getxAxisTitle() {
		return xAxisTitle;
	}

	public String getyAxisTitle() {
		return yAxisTitle;
	}

	public void setGraphTitle(String graphTitle) {
		this.graphTitle = graphTitle;
	}

	public void setxAxisTitle(String xAxisTitle) {
		this.xAxisTitle = xAxisTitle;
	}

	public void setyAxisTitle(String yAxisTitle) {
		this.yAxisTitle = yAxisTitle;
	}

	public boolean isNeedDataRepaint() {
		return needDataRepaint;
	}

	public void setNeedDataRepaint(boolean needDataRepaint) {
		this.needDataRepaint = needDataRepaint;
	}
	
}
