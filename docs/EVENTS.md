<!--
 Copyright (c) 2021 MillenniumEarl
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->
|Event|Arguments|When|
|:---:|:---:|:---|
|`error`|`name: string,
    message: string,
    function: string,
    line: number,
    column: number,
    stack: StackFrame[]`|When an error is thrown and handled with the custom error-handler|