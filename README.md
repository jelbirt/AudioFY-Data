# AudioFY Data

## Introduction

This repository contains the Java code and related configuration files for *AudioFY Data*, a
Java-based computer application for analyzing numerical datasets and
generating audio and visual representations of results.


## User Interface

Upon launch, there are three visible windows associated with the AudioFY app:

1. **Main Window** - left side of the screen, analysis configuration
2. **Graph Panel** - Upper right panel to display graph of data points during play-through
3. **Data Panel** - Lower right panel to display numerical values of data points and any transformations as they are played

## Data Input

Data is read in through a standard 'File' menu button at the top-left of the Main Window, launching a File Chooser to select the input.

In the Main Window, sheetTabPanes open for each sheet within the file chosen allowing users to select one (or multiple) data sources from each sheet.

## Outputs

Select output file directory through the 'File' menu at the top of the Main Window (similar to loading input file).

Specify which output type(s) to be generated at the bottom of the Main Window
prior to play-through. Text output files contain source data points as
well as the results of any normalization or transformations.

Output file types currently supported:

- Comma-Separated Value (.csv)
- Tab-Delimited (.txt)
- Audio File of the sonified data (.wav)

In the future, we hope to develop features to offer generating image (.png) and video (.mp4) files of the play-through and the final Graph Panel image after analysis conclusion.

## Contact

With any questions/suggestions, reach out to the author at jelbirt@worcester.edu.

## Acknowledgements

*AudioFY Data* was developed by Jacob Elbirt as part of the Summer 2023 Aisiku Research Fellowship through Worcester State University.
